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
   * Log a new platform activity event
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
    const updated = [newLog, ...current];
    saveLocalLogs(updated);

    // 2. Dispatch live update event
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(new CustomEvent("bnp_activity_logged", { detail: newLog }));
      } catch {}
    }

    // 3. Asynchronously persist to Supabase `activity_logs` table
    supabase
      .from("activity_logs")
      .insert({
        id: newLog.id,
        event_type: newLog.type,
        user_id: newLog.userId,
        user_nickname: newLog.userNickname,
        user_avatar: newLog.userAvatar,
        user_role: newLog.userRole,
        description: newLog.description,
        metadata: newLog.metadata,
        created_at: newLog.timestamp,
      })
      .then(
        () => {},
        () => {}
      );

    return newLog;
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
   * Sync latest activity logs from Supabase
   */
  async syncFromSupabase(): Promise<ActivityLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(150);

      if (!error && data && data.length > 0) {
        const remoteLogs: ActivityLogEntry[] = data.map((row) => ({
          id: row.id,
          type: row.event_type as ActivityEventType,
          userId: row.user_id,
          userNickname: row.user_nickname,
          userAvatar: row.user_avatar,
          userRole: row.user_role,
          description: row.description,
          metadata: row.metadata,
          timestamp: row.created_at,
        }));

        // Merge with existing local logs by ID
        const local = loadLocalLogs();
        const mergedMap = new Map<string, ActivityLogEntry>();
        remoteLogs.forEach((l) => mergedMap.set(l.id, l));
        local.forEach((l) => {
          if (!mergedMap.has(l.id)) mergedMap.set(l.id, l);
        });

        const mergedList = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        saveLocalLogs(mergedList);
        return mergedList;
      }
    } catch {}

    return loadLocalLogs();
  },

  /**
   * Clear all activity logs
   */
  clearLogs() {
    saveLocalLogs([]);
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(new CustomEvent("bnp_activity_logged"));
      } catch {}
    }
  },
};
