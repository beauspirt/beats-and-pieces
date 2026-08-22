import { UserProfile } from "@/lib/types";
import rawProducers from "@/data/producers.json";

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

  createProducer(profile: UserProfile): UserProfile {
    const custom = loadCustomProducers();
    custom[profile.id] = profile;
    saveCustomProducers(custom);
    producersMap[profile.id] = profile;
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
    return updated;
  },
};
