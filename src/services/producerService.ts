import { UserProfile } from "@/lib/types";
import rawProducers from "@/data/producers.json";
import rawDiscoveryBeats from "@/data/discovery-beats.json";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY_PRODUCERS = "bnp_custom_producers";

export const RESERVED_ROUTES = [
  "admin",
  "api",
  "auth",
  "battles",
  "beats",
  "host",
  "profile",
  "releases",
  "signin",
  "vault",
  "producers",
];

export function sanitizeHandle(raw?: string): string {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, 30);
}

export function validateHandle(handle?: string): { isValid: boolean; error?: string } {
  const clean = sanitizeHandle(handle);
  if (!clean) {
    return { isValid: false, error: "Custom profile URL cannot be empty." };
  }
  if (clean.length < 3) {
    return { isValid: false, error: "Custom URL must be at least 3 characters." };
  }
  if (clean.length > 30) {
    return { isValid: false, error: "Custom URL must be 30 characters or fewer." };
  }
  if (!/^[a-z0-9][a-z0-9-_]*[a-z0-9]$|^[a-z0-9]{3,}$/.test(clean)) {
    return { isValid: false, error: "Custom URL must start and end with a letter or number (hyphens/underscores allowed)." };
  }
  if (RESERVED_ROUTES.includes(clean)) {
    return { isValid: false, error: `'${clean}' is a reserved platform URL. Please choose another.` };
  }
  return { isValid: true };
}

export function sanitizeAvatarUrl(url?: string | null): string {
  if (!url || typeof url !== "string" || url.trim() === "" || url.includes("supabase.co/storage")) {
    return "/avatars/default-avatar.png";
  }
  return url;
}

function loadCustomProducers(): Record<string, UserProfile> {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PRODUCERS);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, UserProfile>;
        Object.keys(parsed).forEach((key) => {
          if (parsed[key]) {
            parsed[key].avatarUrl = sanitizeAvatarUrl(parsed[key].avatarUrl);
            if (parsed[key].createdAt && (parsed[key].createdAt.startsWith("2021-") || parsed[key].createdAt.startsWith("2022-") || parsed[key].createdAt.startsWith("2023-"))) {
              delete parsed[key].createdAt;
            }
          }
        });
        delete parsed["ionbriceag"];
        delete parsed["ondakniv"];
        delete parsed["ceinaru-2"];
        return parsed;
      }
    } catch {}
  }
  return {};
}

function saveCustomProducers(data: Record<string, UserProfile>) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_PRODUCERS, JSON.stringify(data));
    } catch {
      try {
        // If quota exceeded, clean up any oversized data URLs
        const cleaned: Record<string, UserProfile> = {};
        Object.entries(data).forEach(([k, v]) => {
          cleaned[k] = {
            ...v,
            avatarUrl: sanitizeAvatarUrl(v.avatarUrl),
          };
        });
        localStorage.setItem(STORAGE_KEY_PRODUCERS, JSON.stringify(cleaned));
      } catch {}
    }
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
    return Object.values(map).filter((p) => !p.id.startsWith("_"));
  },

  getProducersMap(): Record<string, UserProfile> {
    const custom = typeof window !== "undefined" ? loadCustomProducers() : {};
    const base: Record<string, UserProfile> = {
      ...(rawProducers as Record<string, UserProfile>),
      ...custom,
    };
    delete base["ionbriceag"];
    delete base["ondakniv"];
    delete base["ceinaru-2"];

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
        };
      }
    });

    return base;
  },

  getProducerById(id: string): UserProfile | undefined {
    if (!id) return undefined;
    const map = this.getProducersMap();
    if (map[id]) return map[id];
    
    // Case-insensitive lookup (by id, handle, or nickname)
    const lower = id.toLowerCase().trim();
    const match = Object.values(map).find(
      (p) =>
        p.id.toLowerCase() === lower ||
        (p.handle && p.handle.toLowerCase() === lower) ||
        (p.nickname && p.nickname.toLowerCase() === lower)
    );
    return match;
  },

  getProducerByEmail(email: string): UserProfile | undefined {
    const cleanEmail = email.trim().toLowerCase();
    return Object.values(this.getProducersMap()).find(
      (p) => p.email.toLowerCase() === cleanEmail
    );
  },

  getProducerByHandle(handle?: string): UserProfile | undefined {
    if (!handle) return undefined;
    const clean = sanitizeHandle(handle);
    return Object.values(this.getProducersMap()).find(
      (p) => sanitizeHandle(p.handle || p.id) === clean
    );
  },

  isHandleAvailable(handle: string, excludeUserId?: string): boolean {
    const clean = sanitizeHandle(handle);
    const valid = validateHandle(clean);
    if (!valid.isValid) return false;
    const map = this.getProducersMap();
    const existing = Object.values(map).find((p) => {
      if (excludeUserId && p.id === excludeUserId) return false;
      const h = sanitizeHandle(p.handle || p.id);
      return h === clean || sanitizeHandle(p.id) === clean;
    });
    return !existing;
  },

  getProducerByTag(tag?: string): UserProfile | undefined {
    if (!tag) return undefined;
    const cleanTag = tag.trim().toLowerCase();
    return Object.values(this.getProducersMap()).find(
      (p) =>
        (p.nickname && p.nickname.toLowerCase() === cleanTag) ||
        (p.handle && p.handle.toLowerCase() === cleanTag) ||
        (p.id && p.id.toLowerCase() === cleanTag)
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
          if (p.id.startsWith("_") || p.id === "ionbriceag" || p.id === "ondakniv") return;
          const local = custom[p.id];
          const remoteBio = p.bio?.trim();
          const remoteLocation = p.location?.trim();
          const remoteNickname = p.nickname?.trim();
          const remoteHandle = sanitizeHandle(p.handle || p.links?.handle);
          const localHandle = sanitizeHandle(local?.handle);
          const resolvedHandle = remoteHandle || localHandle || sanitizeHandle(p.id);
          const remoteAvatar = sanitizeAvatarUrl(p.avatar_url);
          const localAvatar = sanitizeAvatarUrl(local?.avatarUrl);

          // Resilient avatar resolution: Preserve valid local avatar if remote is missing or default
          const isRemoteValid = Boolean(remoteAvatar && remoteAvatar !== "/avatars/default-avatar.png");
          const isLocalValid = Boolean(localAvatar && localAvatar !== "/avatars/default-avatar.png");
          const resolvedAvatar = isRemoteValid
            ? remoteAvatar
            : isLocalValid
            ? localAvatar
            : "/avatars/default-avatar.png";

          const remoteHideEmail = p.links?.hideEmail !== undefined
            ? Boolean(p.links.hideEmail)
            : (p.hide_email !== undefined && p.hide_email !== null ? Boolean(p.hide_email) : (local?.hideEmail ?? false));

          const cleanLinks = (p.links && typeof p.links === "object") 
            ? { ...p.links } 
            : (local?.links ? { ...local.links } : {});
          if (remoteHideEmail) {
            cleanLinks.hideEmail = true;
          }
          if (resolvedHandle) {
            cleanLinks.handle = resolvedHandle;
          }

          custom[p.id] = {
            id: p.id,
            handle: resolvedHandle,
            nickname: remoteNickname || local?.nickname || p.id,
            email: p.email || local?.email || "",
            hideEmail: remoteHideEmail,
            avatarUrl: resolvedAvatar,
            bio: remoteBio !== undefined && remoteBio !== "" ? remoteBio : (local?.bio || ""),
            location: remoteLocation !== undefined && remoteLocation !== "" ? remoteLocation : (local?.location || ""),
            role: p.role || local?.role || "producer",
            discordId: p.discord_id || local?.discordId,
            discordUsername: p.discord_username || local?.discordUsername,
            discordRoles: p.discord_roles || local?.discordRoles || [],
            links: cleanLinks,
            stats: p.stats || local?.stats || { battlesEntered: 0, battlesWon: 0, totalFlames: 0 },
            isClaimed: p.is_claimed !== undefined ? p.is_claimed : (local?.isClaimed ?? false),
            claimedAt: p.claimed_at || local?.claimedAt,
            createdAt: p.created_at || local?.createdAt || new Date().toISOString(),
          };
          producersMap[p.id] = custom[p.id];
        });

        // Prune any custom producers that are no longer in Supabase and not in local base producers
        const remoteIds = new Set(data.map((p) => p.id));
        Object.keys(custom).forEach((id) => {
          if (!remoteIds.has(id) && !(rawProducers as Record<string, any>)[id]) {
            delete custom[id];
            delete producersMap[id];
          }
        });

        saveCustomProducers(custom);
        notifyProducersUpdated();
      }
    } catch {
      // console.warn("producerService.syncFromSupabase error:", err);
    }
    return this.getProducersMap();
  },

  createProducer(profile: UserProfile): UserProfile {
    const resolvedHandle = sanitizeHandle(profile.handle || profile.id);
    const sanitizedLinks = { ...(profile.links || {}) };
    if (profile.hideEmail !== undefined) {
      sanitizedLinks.hideEmail = Boolean(profile.hideEmail);
    }
    if (resolvedHandle) {
      sanitizedLinks.handle = resolvedHandle;
    }

    const updatedProfile = {
      ...profile,
      handle: resolvedHandle,
      links: sanitizedLinks,
    };

    const custom = loadCustomProducers();
    custom[updatedProfile.id] = updatedProfile;
    saveCustomProducers(custom);
    producersMap[updatedProfile.id] = updatedProfile;
    notifyProducersUpdated();

    // Async write to Supabase
    supabase.from("producers").upsert({
      id: updatedProfile.id,
      nickname: updatedProfile.nickname,
      email: updatedProfile.email,
      avatar_url: updatedProfile.avatarUrl,
      bio: updatedProfile.bio || "",
      location: updatedProfile.location || "",
      role: updatedProfile.role || "producer",
      discord_id: updatedProfile.discordId,
      discord_username: updatedProfile.discordUsername,
      discord_roles: updatedProfile.discordRoles || [],
      links: sanitizedLinks,
      stats: updatedProfile.stats || { battlesEntered: 0, battlesWon: 0, totalFlames: 0 },
      is_claimed: updatedProfile.isClaimed || false,
      claimed_at: updatedProfile.claimedAt,
      created_at: updatedProfile.createdAt || new Date().toISOString(),
    }).then(
      () => {},
      () => {}
    );

    return updatedProfile;
  },

  updateProducer(id: string, updates: Partial<UserProfile>): UserProfile {
    const current = this.getProducerById(id) || producersMap[id];
    if (!current) {
      const fallback: UserProfile = {
        id,
        handle: sanitizeHandle(updates.handle || id),
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

    const resolvedHandle = sanitizeHandle(updates.handle !== undefined ? updates.handle : (current.handle || id));
    const updatedHideEmail = updates.hideEmail !== undefined ? Boolean(updates.hideEmail) : (current.hideEmail ?? false);
    const sanitizedLinks = {
      ...(current.links || {}),
      ...(updates.links || {}),
    };
    if (updatedHideEmail) {
      sanitizedLinks.hideEmail = true;
    } else {
      delete sanitizedLinks.hideEmail;
    }
    if (resolvedHandle) {
      sanitizedLinks.handle = resolvedHandle;
    }

    const updated: UserProfile = {
      ...current,
      ...updates,
      handle: resolvedHandle,
      hideEmail: updatedHideEmail,
      links: sanitizedLinks,
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
      avatar_url: updated.avatarUrl,
      bio: updated.bio || "",
      location: updated.location || "",
      role: updated.role || "producer",
      discord_id: updated.discordId,
      discord_username: updated.discordUsername,
      discord_roles: updated.discordRoles || [],
      links: sanitizedLinks,
      stats: updated.stats || { battlesEntered: 0, battlesWon: 0, totalFlames: 0 },
      is_claimed: updated.isClaimed || false,
      claimed_at: updated.claimedAt,
      created_at: updated.createdAt || new Date().toISOString(),
    }).then(
      () => {},
      () => {}
    );

    return updated;
  },

  async updateProducerAsync(id: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const updated = this.updateProducer(id, updates);
    const sanitizedLinks = { ...(updated.links || {}) };
    if (updated.hideEmail) {
      sanitizedLinks.hideEmail = true;
    } else {
      delete sanitizedLinks.hideEmail;
    }
    if (updated.handle) {
      sanitizedLinks.handle = updated.handle;
    }

    try {
      await supabase.from("producers").upsert({
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
        links: sanitizedLinks,
        stats: updated.stats || { battlesEntered: 0, battlesWon: 0, totalFlames: 0 },
        is_claimed: updated.isClaimed || false,
        claimed_at: updated.claimedAt,
        created_at: updated.createdAt || new Date().toISOString(),
      });
    } catch {}
    return updated;
  },
};

// Initial background sync if in browser
if (typeof window !== "undefined") {
  producerService.syncFromSupabase().catch(() => {});
}
