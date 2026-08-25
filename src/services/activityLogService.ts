import { supabase } from "@/lib/supabase";

export type ActivityEventType =
  | "auth.login"
  | "auth.signup"
  | "profile.update"
  | "beat.upload"
  | "beat.delete"
  | "battle.submit"
  | "battle.vote"
  | "battle.jury_score"
  | "battle.create"
  | "battle.update"
  | "release.create"
  | "release.update";

export type ActivityCategory = "all" | "auth" | "profiles" | "beats" | "battles" | "releases";

export interface ActivityLogEntry {
  id: string;
  type: ActivityEventType;
  userId?: string;
  userNickname?: string;
  userAvatar?: string;
  userRole?: string;
  description: string;
  metadata?: Record<string, unknown>;
  timestamp: string; // ISO 8601
}

const STORAGE_KEY_LOGS = "bnp_activity_logs";

function loadLocalLogs(): ActivityLogEntry[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LOGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Purge any legacy mock seed logs
          return parsed.filter((l) => !l.id?.startsWith("log-seed-"));
        }
      }
    } catch {}
  }
  return [];
}

function saveLocalLogs(logs: ActivityLogEntry[]) {
  if (typeof window !== "undefined") {
    try {
      const cleanLogs = logs.filter((l) => !l.id?.startsWith("log-seed-"));
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(cleanLogs));
    } catch {}
  }
}

export const activityLogService = {
  /**
   * Log a new platform activity event with immediate local & Supabase persistence
   */
  logActivity(entry: {
    type: ActivityEventType;
    userId?: string;
    userNickname?: string;
    userAvatar?: string;
    userRole?: string;
    description: string;
    metadata?: Record<string, unknown>;
  }): ActivityLogEntry {
    const newLog: ActivityLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };

    // 1. Update local cache
    const current = loadLocalLogs();
    const updated = [newLog, ...current.filter((l) => l.id !== newLog.id)];
    saveLocalLogs(updated);

    // 2. Dispatch live update event
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(new CustomEvent("bnp_activity_logged", { detail: newLog }));
      } catch {}
    }

    // 3. Asynchronously persist to Supabase database (with dual resilience)
    this.persistToSupabase(newLog);

    return newLog;
  },

  /**
   * Persist activity to Supabase with automatic multi-table resilience
   */
  async persistToSupabase(log: ActivityLogEntry) {
    try {
      // 1. Attempt write to dedicated activity_logs table
      supabase
        .from("activity_logs")
        .insert({
          id: log.id,
          event_type: log.type,
          user_id: log.userId,
          user_nickname: log.userNickname,
          user_avatar: log.userAvatar,
          user_role: log.userRole,
          description: log.description,
          metadata: log.metadata,
          created_at: log.timestamp,
        })
        .then(
          () => {},
          () => {}
        );

      // 2. Guaranteed cross-device fallback: store in global database audit row
      const { data } = await supabase
        .from("producers")
        .select("links")
        .eq("id", "_activity_logs_")
        .single();

      const existing: ActivityLogEntry[] = (data?.links?.logs as ActivityLogEntry[]) || [];
      const updated = [log, ...existing.filter((l) => l.id !== log.id && !l.id?.startsWith("log-seed-"))].slice(0, 300);

      await supabase.from("producers").upsert({
        id: "_activity_logs_",
        nickname: "System Audit Logs",
        email: "audit@beatsandpieces.ro",
        avatar_url: "/avatars/default-avatar.png",
        role: "system",
        links: { logs: updated },
        created_at: new Date().toISOString(),
      });
    } catch {}
  },

  /**
   * Get all activity logs with optional category, search, and limit filters
   */
  getLogs(options?: {
    category?: ActivityCategory;
    search?: string;
    limit?: number;
  }): ActivityLogEntry[] {
    let logs = loadLocalLogs();

    const { category = "all", search = "", limit = 100 } = options || {};

    // Filter by category
    if (category !== "all") {
      logs = logs.filter((log) => {
        if (category === "auth") return log.type.startsWith("auth.");
        if (category === "profiles") return log.type.startsWith("profile.");
        if (category === "beats") return log.type.startsWith("beat.");
        if (category === "battles") return log.type.startsWith("battle.");
        if (category === "releases") return log.type.startsWith("release.");
        return true;
      });
    }

    // Search filter
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      logs = logs.filter(
        (log) =>
          log.description.toLowerCase().includes(q) ||
          (log.userNickname && log.userNickname.toLowerCase().includes(q)) ||
          log.type.toLowerCase().includes(q)
      );
    }

    // Sort newest first
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return logs.slice(0, limit);
  },

  /**
   * Sync latest activity logs across all devices from Supabase
   */
  async syncFromSupabase(): Promise<ActivityLogEntry[]> {
    const mergedMap = new Map<string, ActivityLogEntry>();

    // 1. Add current local logs
    const local = loadLocalLogs();
    local.forEach((l) => {
      if (!l.id?.startsWith("log-seed-")) {
        mergedMap.set(l.id, l);
      }
    });

    try {
      // 2. Fetch from dedicated table if available
      const { data: tableData } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(150);

      if (tableData && tableData.length > 0) {
        tableData.forEach((row) => {
          mergedMap.set(row.id, {
            id: row.id,
            type: row.event_type as ActivityEventType,
            userId: row.user_id,
            userNickname: row.user_nickname,
            userAvatar: row.user_avatar,
            userRole: row.user_role,
            description: row.description,
            metadata: row.metadata,
            timestamp: row.created_at,
          });
        });
      }

      // 3. Fetch from global database audit record
      const { data: fallbackData } = await supabase
        .from("producers")
        .select("links")
        .eq("id", "_activity_logs_")
        .single();

      if (fallbackData?.links?.logs && Array.isArray(fallbackData.links.logs)) {
        fallbackData.links.logs.forEach((l: ActivityLogEntry) => {
          if (l.id && !l.id.startsWith("log-seed-")) {
            mergedMap.set(l.id, l);
          }
        });
      }
    } catch {}

    const mergedList = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    saveLocalLogs(mergedList);
    return mergedList;
  },

  /**
   * Clear all activity logs
   */
  async clearLogs() {
    saveLocalLogs([]);
    try {
      await supabase.from("producers").upsert({
        id: "_activity_logs_",
        nickname: "System Audit Logs",
        email: "audit@beatsandpieces.ro",
        avatar_url: "/avatars/default-avatar.png",
        role: "system",
        links: { logs: [] },
        created_at: new Date().toISOString(),
      });
    } catch {}
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(new CustomEvent("bnp_activity_logged"));
      } catch {}
    }
  },
};
