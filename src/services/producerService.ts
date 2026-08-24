import { UserProfile } from "@/lib/types";
import rawProducers from "@/data/producers.json";
import rawDiscoveryBeats from "@/data/discovery-beats.json";
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

export function notifyProducersUpdated() {
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("bnp_producers_updated"));
    } catch {}
  }
}

export const producerService = {
  getAllProducers(): UserProfile[] {
    const map = this.getProducersMap();
    return Object.values(map);
  },

  getProducersMap(): Record<string, UserProfile> {
    const custom = typeof window !== "undefined" ? loadCustomProducers() : {};
    const base: Record<string, UserProfile> = {
      ...(rawProducers as Record<string, UserProfile>),
      ...custom,
    };

    // Auto-populate any beatmaker from discovery-beats.json that is not explicitly defined in producers.json
    (rawDiscoveryBeats as Array<{ beatmaker?: { id?: string; tag?: string; avatarUrl?: string }; rank?: number; createdAt?: string }>).forEach((beat) => {
      const bId = beat.beatmaker?.id;
      if (bId && !base[bId]) {
        base[bId] = {
          id: bId,
          nickname: beat.beatmaker?.tag || bId,
          email: `${bId}@beatsandpieces.ro`,
          avatarUrl: beat.beatmaker?.avatarUrl || "/avatars/default-avatar.png",
          bio: "Community Beatmaker & Battle Producer",
          location: "Romania",
          role: "producer",
          discordRoles: ["Battle Producer"],
          links: {},
          stats: {
            battlesEntered: 1,
            battlesWon: beat.rank === 1 ? 1 : 0,
            totalFlames: 0,
          },
          isClaimed: false,
          createdAt: beat.createdAt || "2023-01-01T00:00:00Z",
        };
      }
    });

    return base;
  },

  getProducerById(id: string): UserProfile | undefined {
    if (!id) return undefined;
    const map = this.getProducersMap();
    if (map[id]) return map[id];
    
    // Case-insensitive lookup
    const lower = id.toLowerCase();
    const match = Object.values(map).find(
      (p) => p.id.toLowerCase() === lower || (p.nickname && p.nickname.toLowerCase() === lower)
    );
    if (match) return match;

    // Fallback stub for unknown user IDs
    return {
      id,
      nickname: id.length > 20 ? `Producer-${id.slice(0, 5)}` : id,
      email: `${id}@beatsandpieces.ro`,
      avatarUrl: "/avatars/default-avatar.png",
      bio: "Community Beatmaker",
      location: "Romania",
      role: "producer",
      discordRoles: ["Battle Producer"],
      links: {},
      stats: {
        battlesEntered: 0,
        battlesWon: 0,
        totalFlames: 0,
      },
      isClaimed: false,
      createdAt: new Date().toISOString(),
    };
  },

  getProducerByEmail(email: string): UserProfile | undefined {
    const cleanEmail = email.trim().toLowerCase();
    return Object.values(this.getProducersMap()).find(
      (p) => p.email.toLowerCase() === cleanEmail
    );
  },

  getProducerByTag(tag?: string): UserProfile | undefined {
    if (!tag) return undefined;
    const cleanTag = tag.trim().toLowerCase();
    return Object.values(this.getProducersMap()).find(
      (p) => (p.nickname && p.nickname.toLowerCase() === cleanTag) || (p.id && p.id.toLowerCase() === cleanTag)
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
          const local = custom[p.id];
          const remoteBio = p.bio?.trim();
          const remoteLocation = p.location?.trim();
          const remoteNickname = p.nickname?.trim();
          const remoteAvatar = p.avatar_url;

          custom[p.id] = {
            id: p.id,
            nickname: remoteNickname || local?.nickname || p.id,
            email: p.email || local?.email || "",
            hideEmail: p.hide_email !== undefined && p.hide_email !== null 
              ? Boolean(p.hide_email) 
              : (local?.hideEmail ?? false),
            avatarUrl: remoteAvatar || local?.avatarUrl || "/avatars/default-avatar.png",
            bio: remoteBio !== undefined && remoteBio !== "" ? remoteBio : (local?.bio || ""),
            location: remoteLocation !== undefined && remoteLocation !== "" ? remoteLocation : (local?.location || ""),
            role: p.role || local?.role || "producer",
            discordId: p.discord_id || local?.discordId,
            discordUsername: p.discord_username || local?.discordUsername,
            discordRoles: p.discord_roles || local?.discordRoles || [],
            links: (p.links && Object.keys(p.links).length > 0) ? p.links : (local?.links || {}),
            stats: p.stats || local?.stats || { battlesEntered: 0, battlesWon: 0, totalFlames: 0 },
            isClaimed: p.is_claimed !== undefined ? p.is_claimed : (local?.isClaimed ?? false),
            claimedAt: p.claimed_at || local?.claimedAt,
            createdAt: p.created_at || local?.createdAt || new Date().toISOString(),
          };
          producersMap[p.id] = custom[p.id];
        });
        saveCustomProducers(custom);
        notifyProducersUpdated();
      }
    } catch (err) {
      // console.warn("producerService.syncFromSupabase error:", err);
    }
    return this.getProducersMap();
  },

  createProducer(profile: UserProfile): UserProfile {
    const custom = loadCustomProducers();
    custom[profile.id] = profile;
    saveCustomProducers(custom);
    producersMap[profile.id] = profile;
    notifyProducersUpdated();

    // Async write to Supabase
    supabase.from("producers").upsert({
      id: profile.id,
      nickname: profile.nickname,
      email: profile.email,
      hide_email: Boolean(profile.hideEmail),
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
        // if (error) console.warn("Supabase producer upsert failed:", error.message);
      },
      () => {}
    );

    return profile;
  },

  updateProducer(id: string, updates: Partial<UserProfile>): UserProfile {
    const current = this.getProducerById(id) || producersMap[id];
    if (!current) {
      const fallback: UserProfile = {
        id,
        nickname: id,
        email: `${id}@beatsandpieces.ro`,
        hideEmail: false,
        avatarUrl: "/avatars/default-avatar.png",
        bio: "",
        location: "",
        role: "producer",
        discordRoles: [],
        links: {},
        stats: { battlesEntered: 0, battlesWon: 0, totalFlames: 0 },
        isClaimed: false,
        createdAt: new Date().toISOString(),
        ...updates,
      };
      return this.createProducer(fallback);
    }

    const updated: UserProfile = {
      ...current,
      ...updates,
    };

    const custom = loadCustomProducers();
    custom[id] = updated;
    saveCustomProducers(custom);
    producersMap[id] = updated;
    notifyProducersUpdated();

    // Async write to Supabase
    supabase.from("producers").upsert({
      id: updated.id,
      nickname: updated.nickname,
      email: updated.email,
      hide_email: Boolean(updated.hideEmail),
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
        // if (error) console.warn("Supabase producer update failed:", error.message);
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
