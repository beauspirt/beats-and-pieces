import { DiscoveryBeat } from "@/lib/types";
import rawDiscoveryBeats from "@/data/discovery-beats.json";

const STORAGE_KEY_CUSTOM_BEATS = "bnp_custom_beats";
const STORAGE_KEY_BEAT_OVERRIDES = "bnp_beats_overrides";
const STORAGE_KEY_DELETED_BEATS = "bnp_deleted_beats";

function loadCustomBeats(): DiscoveryBeat[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_BEATS);
      if (stored) return JSON.parse(stored);
    } catch {}
  }
  return [];
}

function loadBeatOverrides(): Record<string, Partial<DiscoveryBeat>> {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_BEAT_OVERRIDES);
      if (stored) return JSON.parse(stored);
    } catch {}
  }
  return {};
}

function loadDeletedBeatIds(): string[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DELETED_BEATS);
      if (stored) return JSON.parse(stored);
    } catch {}
  }
  return [];
}

export const beatService = {
  getAllDiscoveryBeats(): DiscoveryBeat[] {
    const raw = [...(rawDiscoveryBeats as DiscoveryBeat[])];
    const custom = loadCustomBeats();
    const overrides = loadBeatOverrides();
    const deleted = loadDeletedBeatIds();

    const combined = [...raw, ...custom]
      .filter((b) => !deleted.includes(b.id))
      .map((b) => (overrides[b.id] ? { ...b, ...overrides[b.id] } : b));

    return combined;
  },

  getBeatsByProducer(producerTagOrId: string): DiscoveryBeat[] {
    const clean = producerTagOrId.toLowerCase().trim();
    return this.getAllDiscoveryBeats().filter(
      (b) =>
        b.beatmaker.id.toLowerCase() === clean ||
        b.beatmaker.tag.toLowerCase() === clean
    );
  },

  updateBeat(id: string, updates: Partial<DiscoveryBeat>): DiscoveryBeat | null {
    if (typeof window !== "undefined") {
      // 1. If it's in custom beats, update it directly
      const custom = loadCustomBeats();
      const customIndex = custom.findIndex((b) => b.id === id);
      if (customIndex !== -1) {
        custom[customIndex] = { ...custom[customIndex], ...updates };
        try {
          localStorage.setItem(STORAGE_KEY_CUSTOM_BEATS, JSON.stringify(custom));
        } catch {}
        return custom[customIndex];
      }

      // 2. Otherwise store in overrides
      const overrides = loadBeatOverrides();
      overrides[id] = { ...(overrides[id] || {}), ...updates };
      try {
        localStorage.setItem(STORAGE_KEY_BEAT_OVERRIDES, JSON.stringify(overrides));
      } catch {}
    }

    const all = this.getAllDiscoveryBeats();
    return all.find((b) => b.id === id) || null;
  },

  deleteBeat(id: string): boolean {
    if (typeof window !== "undefined") {
      // 1. Remove from custom beats if present
      const custom = loadCustomBeats();
      const filtered = custom.filter((b) => b.id !== id);
      if (filtered.length !== custom.length) {
        try {
          localStorage.setItem(STORAGE_KEY_CUSTOM_BEATS, JSON.stringify(filtered));
        } catch {}
        return true;
      }

      // 2. Add to deleted IDs list
      const deleted = loadDeletedBeatIds();
      if (!deleted.includes(id)) {
        deleted.push(id);
        try {
          localStorage.setItem(STORAGE_KEY_DELETED_BEATS, JSON.stringify(deleted));
        } catch {}
      }
      return true;
    }
    return false;
  },

  createBeat(beat: Omit<DiscoveryBeat, "id"> & { id?: string }): DiscoveryBeat {
    const newBeat: DiscoveryBeat = {
      ...beat,
      id: beat.id || `beat-custom-${Date.now()}`,
    };

    if (typeof window !== "undefined") {
      const custom = loadCustomBeats();
      custom.unshift(newBeat);
      try {
        localStorage.setItem(STORAGE_KEY_CUSTOM_BEATS, JSON.stringify(custom));
      } catch {}
    }

    return newBeat;
  },

  toggleFavorite(beatId: string): boolean {
    if (typeof window !== "undefined") {
      try {
        const savedFavs = localStorage.getItem("bnp_favorites");
        let favs: string[] = savedFavs ? JSON.parse(savedFavs) : [];
        if (favs.includes(beatId)) {
          favs = favs.filter((id) => id !== beatId);
        } else {
          favs.push(beatId);
        }
        localStorage.setItem("bnp_favorites", JSON.stringify(favs));
        return favs.includes(beatId);
      } catch {}
    }
    return false;
  },
};
