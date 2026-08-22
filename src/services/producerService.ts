import { UserProfile } from "@/lib/types";
import rawProducers from "@/data/producers.json";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY_PRODUCERS = "bnp_custom_producers";

function loadCustomProducers(): Record<string, UserProfile> {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PRODUCERS);
      if (stored) return JSON.parse(stored);
    } catch {}
  }
  return {};
}

function saveCustomProducers(data: Record<string, UserProfile>) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_PRODUCERS, JSON.stringify(data));
    } catch {}
  }
}

let customProducers = loadCustomProducers();
let producersMap: Record<string, UserProfile> = {
  ...(rawProducers as Record<string, UserProfile>),
  ...customProducers,
};

export const producerService = {
  getAllProducers(): UserProfile[] {
    if (typeof window !== "undefined") {
      const fresh = loadCustomProducers();
      return Object.values({ ...(rawProducers as Record<string, UserProfile>), ...fresh });
    }
    return Object.values(producersMap);
  },

  getProducersMap(): Record<string, UserProfile> {
    if (typeof window !== "undefined") {
      const fresh = loadCustomProducers();
      return { ...(rawProducers as Record<string, UserProfile>), ...fresh };
    }
    return { ...producersMap };
  },

  getProducerById(id: string): UserProfile | undefined {
    return this.getProducersMap()[id];
  },

  getProducerByEmail(email: string): UserProfile | undefined {
    const cleanEmail = email.trim().toLowerCase();
    return Object.values(this.getProducersMap()).find(
      (p) => p.email.toLowerCase() === cleanEmail
    );
  },

  /**
   * Sync latest producers from Supabase table into local cache
   */
  async syncFromSupabase(): Promise<Record<string, UserProfile>> {
    try {
      const { data, error } = await supabase.from("producers").select("*");
      if (!error && data && data.length > 0) {
        const custom = loadCustomProducers();
        data.forEach((p) => {
          custom[p.id] = {
            id: p.id,
            nickname: p.nickname,
            email: p.email,
            avatarUrl: p.avatar_url,
            bio: p.bio || "",
            location: p.location || "",
            role: p.role,
            discordId: p.discord_id,
            discordUsername: p.discord_username,
            discordRoles: p.discord_roles || [],
            links: p.links || {},
            stats: p.stats || { battlesEntered: 0, battlesWon: 0, totalFlames: 0 },
            isClaimed: p.is_claimed,
            claimedAt: p.claimed_at,
            createdAt: p.created_at,
          };
          producersMap[p.id] = custom[p.id];
        });
        saveCustomProducers(custom);
      }
    } catch (err) {
      console.warn("producerService.syncFromSupabase error:", err);
    }
    return this.getProducersMap();
  },

  createProducer(profile: UserProfile): UserProfile {
    const custom = loadCustomProducers();
    custom[profile.id] = profile;
    saveCustomProducers(custom);
    producersMap[profile.id] = profile;

    // Async write to Supabase
    supabase.from("producers").upsert({
      id: profile.id,
      nickname: profile.nickname,
      email: profile.email,
      avatar_url: profile.avatarUrl,
      bio: profile.bio || "",
      location: profile.location || "",
      role: profile.role || "producer",
      discord_id: profile.discordId,
      discord_username: profile.discordUsername,
      discord_roles: profile.discordRoles || [],
      links: profile.links || {},
      stats: profile.stats || { battlesEntered: 0, battlesWon: 0, totalFlames: 0 },
      is_claimed: profile.isClaimed || false,
      claimed_at: profile.claimedAt,
      created_at: profile.createdAt || new Date().toISOString(),
    }).then(
      ({ error }) => {
        if (error) console.warn("Supabase producer upsert failed:", error.message);
      },
      () => {}
    );

    return profile;
  },

  updateProducer(id: string, updates: Partial<UserProfile>): UserProfile {
    const current = this.getProducerById(id) || producersMap[id];
    if (!current) {
      const newProfile: UserProfile = {
        id,
        nickname: updates.nickname || id,
        email: updates.email || `${id}@beatsandpieces.ro`,
        avatarUrl: updates.avatarUrl || "/avatars/default-avatar.png",
        role: updates.role || "producer",
        isClaimed: true,
        createdAt: new Date().toISOString(),
        ...updates,
      };
      return this.createProducer(newProfile);
    }

    const updated = { ...current, ...updates, isClaimed: true };
    const custom = loadCustomProducers();
    custom[id] = updated;
    saveCustomProducers(custom);

    producersMap[id] = updated;

    // Async write to Supabase
    supabase.from("producers").upsert({
      id: updated.id,
      nickname: updated.nickname,
      email: updated.email,
      avatar_url: updated.avatarUrl,
      bio: updated.bio || "",
      location: updated.location || "",
      role: updated.role || "producer",
      discord_id: updated.discordId,
      discord_username: updated.discordUsername,
      discord_roles: updated.discordRoles || [],
      links: updated.links || {},
      stats: updated.stats || { battlesEntered: 0, battlesWon: 0, totalFlames: 0 },
      is_claimed: updated.isClaimed || false,
      claimed_at: updated.claimedAt,
      created_at: updated.createdAt || new Date().toISOString(),
    }).then(
      ({ error }) => {
        if (error) console.warn("Supabase producer update failed:", error.message);
      },
      () => {}
    );

    return updated;
  },
};

// Initial background sync if in browser
if (typeof window !== "undefined") {
  producerService.syncFromSupabase().catch(() => {});
}
