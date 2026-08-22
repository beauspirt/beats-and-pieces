import { Release } from "@/lib/types";
import rawReleases from "@/data/releases.json";

const STORAGE_KEY_RELEASES = "bnp_custom_releases";

function loadCustomReleases(): Release[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_RELEASES);
      if (stored) return JSON.parse(stored);
    } catch {}
  }
  return [];
}

function saveCustomReleases(releases: Release[]) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_RELEASES, JSON.stringify(releases));
    } catch {}
  }
}

let customReleasesList = loadCustomReleases();

export const releaseService = {
  getAllReleases(): Release[] {
    if (typeof window !== "undefined") {
      const custom = loadCustomReleases();
      // Merge custom edits with rawReleases
      const map = new Map<string, Release>();
      for (const r of rawReleases as Release[]) {
        map.set(r.id, r);
      }
      for (const r of custom) {
        map.set(r.id, r);
      }
      return Array.from(map.values());
    }
    return [...(rawReleases as Release[])];
  },

  getReleaseById(idOrSlug: string): Release | undefined {
    return this.getAllReleases().find(
      (r) => r.id === idOrSlug || r.slug === idOrSlug
    );
  },

  createRelease(releaseData: Partial<Release>): Release {
    const existing = this.getAllReleases();
    const nextNumber = existing.length + 1;

    const newRelease: Release = {
      id: releaseData.id || `rel-${Date.now()}`,
      title: releaseData.title || `Flip Tape #${nextNumber}`,
      slug: releaseData.slug || `flip-tape-${nextNumber}`,
      coverImage: releaseData.coverImage || "/covers/releases/flip-tape-1.png",
      releaseDate: releaseData.releaseDate || new Date().toISOString().split("T")[0],
      description: releaseData.description || "",
      spotifyUrl: releaseData.spotifyUrl,
      youtubeUrl: releaseData.youtubeUrl,
      appleMusicUrl: releaseData.appleMusicUrl,
      bandcampUrl: releaseData.bandcampUrl,
      soundcloudUrl: releaseData.soundcloudUrl,
    };

    const currentCustom = loadCustomReleases();
    const updated = [newRelease, ...currentCustom.filter((r) => r.id !== newRelease.id)];
    saveCustomReleases(updated);
    return newRelease;
  },

  updateRelease(id: string, updates: Partial<Release>): Release | null {
    const all = this.getAllReleases();
    const target = all.find((r) => r.id === id);
    if (!target) return null;

    const updatedRelease: Release = { ...target, ...updates };
    const currentCustom = loadCustomReleases();
    const filtered = currentCustom.filter((r) => r.id !== id);
    saveCustomReleases([...filtered, updatedRelease]);
    return updatedRelease;
  },
};
