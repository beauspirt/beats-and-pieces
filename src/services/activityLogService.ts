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

const SEED_LOGS: ActivityLogEntry[] = [
  {
    id: "log-seed-1",
    type: "battle.jury_score",
    userId: "nerub",
    userNickname: "Nerub",
    userAvatar: "/avatars/nerub.jpg",
    userRole: "host",
    description: "Evaluated 12 final submissions for Beat Battle #8 (The Last Slice)",
    metadata: { battleId: "battle-8", evaluationsCount: 12 },
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
  },
  {
    id: "log-seed-2",
    type: "beat.upload",
    userId: "vulpeanu",
    userNickname: "Vulpeanu",
    userAvatar: "/avatars/vulpeanu.jpg",
    userRole: "producer",
    description: "Uploaded new showcase beat 'Bucharest Drift' (92 BPM)",
    metadata: { beatTitle: "Bucharest Drift", bpm: 92, priceTag: "For Sale" },
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
  },
  {
    id: "log-seed-3",
    type: "battle.vote",
    userId: "mldn",
    userNickname: "MLDN",
    userAvatar: "/avatars/mldn.jpg",
    userRole: "producer",
    description: "Submitted Phase 2 public rating ballot for Beat Battle #8",
    metadata: { battleId: "battle-8", ratedCount: 15 },
    timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(), // 4 hours ago
  },
  {
    id: "log-seed-4",
    type: "profile.update",
    userId: "adrianhrihor",
    userNickname: "Adrian Hrihor",
    userAvatar: "/avatars/default-avatar.png",
    userRole: "admin",
    description: "Updated profile details and music links",
    metadata: { location: "Bucharest, Romania", linksUpdated: ["instagram", "spotify"] },
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(), // 6 hours ago
  },
  {
    id: "log-seed-5",
    type: "auth.login",
    userId: "nerub",
    userNickname: "Nerub",
    userAvatar: "/avatars/nerub.jpg",
    userRole: "host",
    description: "Signed in via Google OAuth",
    metadata: { provider: "google" },
    timestamp: new Date(Date.now() - 1000 * 60 * 480).toISOString(), // 8 hours ago
  },
  {
    id: "log-seed-6",
    type: "release.create",
    userId: "nerub",
    userNickname: "Nerub",
    userAvatar: "/avatars/nerub.jpg",
    userRole: "admin",
    description: "Published new compilation release 'Volume 3: Winter Heat'",
    metadata: { releaseTitle: "Volume 3: Winter Heat", trackCount: 14 },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  },
];

function loadLocalLogs(): ActivityLogEntry[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LOGS);
      if (stored) return JSON.parse(stored);
    } catch {}
  }
  return SEED_LOGS;
}

function saveLocalLogs(logs: ActivityLogEntry[]) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
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
