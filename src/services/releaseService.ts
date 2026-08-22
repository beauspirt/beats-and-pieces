import { Release } from "@/lib/types";
import rawReleases from "@/data/releases.json";
import { supabase } from "@/lib/supabase";

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

export const releaseService = {
  getAllReleases(): Release[] {
    const rawList = (rawReleases as Release[]) || [];
    const map = new Map<string, Release>();

    for (const r of rawList) {
      map.set(r.id, r);
    }

    if (typeof window !== "undefined") {
      const custom = loadCustomReleases();
      for (const r of custom) {
        if (!map.has(r.id)) {
          map.set(r.id, r);
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const timeA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
      const timeB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
      return timeB - timeA;
    });
  },

  getReleaseById(idOrSlug: string): Release | undefined {
    return this.getAllReleases().find(
      (r) => r.id === idOrSlug || r.slug === idOrSlug
    );
  },

  /**
   * Sync releases live from Supabase
   */
  async syncFromSupabase(): Promise<void> {
    try {
      const { data, error } = await supabase.from("releases").select("*");
      if (!error && data && data.length > 0) {
        const mapped: Release[] = data.map((r) => ({
          id: r.id,
          title: r.title,
          slug: r.slug,
          coverImage: r.cover_image,
          releaseDate: r.release_date,
          description: r.description || "",
          spotifyUrl: r.spotify_url,
          appleMusicUrl: r.apple_music_url,
          youtubeUrl: r.youtube_url,
          bandcampUrl: r.bandcamp_url,
          soundcloudUrl: r.soundcloud_url,
          streamingLinks: r.streaming_links || {},
          tracklist: r.tracklist || [],
        }));
        saveCustomReleases(mapped);
      }
    } catch (err) {
      console.warn("releaseService.syncFromSupabase error:", err);
    }
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

    // Async write to Supabase
    supabase.from("releases").upsert({
      id: newRelease.id,
      title: newRelease.title,
      slug: newRelease.slug,
      cover_image: newRelease.coverImage,
      release_date: newRelease.releaseDate,
      description: newRelease.description,
      spotify_url: newRelease.spotifyUrl,
      apple_music_url: newRelease.appleMusicUrl,
      youtube_url: newRelease.youtubeUrl,
      bandcamp_url: newRelease.bandcampUrl,
      soundcloud_url: newRelease.soundcloudUrl,
    }).then(
      ({ error }) => {
        if (error) console.warn("Supabase release insert failed:", error.message);
      },
      () => {}
    );

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

    // Async update to Supabase
    supabase.from("releases").upsert({
      id: updatedRelease.id,
      title: updatedRelease.title,
      slug: updatedRelease.slug,
      cover_image: updatedRelease.coverImage,
      release_date: updatedRelease.releaseDate,
      description: updatedRelease.description,
      spotify_url: updatedRelease.spotifyUrl,
      apple_music_url: updatedRelease.appleMusicUrl,
      youtube_url: updatedRelease.youtubeUrl,
      bandcamp_url: updatedRelease.bandcampUrl,
      soundcloud_url: updatedRelease.soundcloudUrl,
    }).then(
      ({ error }) => {
        if (error) console.warn("Supabase release update failed:", error.message);
      },
      () => {}
    );

    return updatedRelease;
  },
};

// Initial background sync if in browser
if (typeof window !== "undefined") {
  releaseService.syncFromSupabase().catch(() => {});
}
