import { DiscoveryBeat } from "@/lib/types";
import rawDiscoveryBeats from "@/data/discovery-beats.json";
import { supabase } from "@/lib/supabase";
import { battleService } from "./battleService";
import { producerService } from "./producerService";

const STORAGE_KEY_CUSTOM_BEATS = "bnp_custom_beats";
const STORAGE_KEY_BEAT_OVERRIDES = "bnp_beats_overrides";
const STORAGE_KEY_DELETED_BEATS = "bnp_deleted_beats";

let customBeatsMemory: DiscoveryBeat[] = [];

function loadCustomBeats(): DiscoveryBeat[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_BEATS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          customBeatsMemory = parsed;
          return parsed;
        }
      }
    } catch {}
  }
  return customBeatsMemory;
}

function saveCustomBeats(beats: DiscoveryBeat[]) {
  customBeatsMemory = beats;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_BEATS, JSON.stringify(beats));
    } catch (err) {
      // console.warn("saveCustomBeats localStorage quota warning:", err);
    }
  }
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

export function notifyBeatsUpdated() {
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("bnp_beats_updated"));
    } catch {}
  }
}

export const beatService = {
  getAllDiscoveryBeats(): DiscoveryBeat[] {
    const raw = [...(rawDiscoveryBeats as DiscoveryBeat[])];
    const custom = loadCustomBeats();
    const overrides = loadBeatOverrides();
    const deleted = loadDeletedBeatIds();

    // Dynamically pull all submissions from finished/completed battles
    const battleBeats: DiscoveryBeat[] = [];
    try {
      const completedBattles = battleService.getAllBattles().filter((b) => b.phase === "completed");
      completedBattles.forEach((b) => {
        const subs = battleService.getSubmissionsByBattleId(b.id);
        subs.forEach((sub) => {
          const prod = producerService.getProducerById(sub.userId) || producerService.getProducerByTag(sub.beatmakerTag);
          let beatTitle = sub.beatTitle || (b.title ? `${b.title} Entry` : "Untitled Beat");
          if (/^Beat Battle #\d+$/i.test(beatTitle.trim())) {
            beatTitle = `${beatTitle.trim()} Entry`;
          }
          battleBeats.push({
            id: `sub-${sub.id}`,
            title: beatTitle,
            beatmaker: {
              id: sub.userId || "producer",
              tag: sub.beatmakerTag || "Producer",
              avatarUrl: prod?.avatarUrl || "/avatars/default-avatar.png",
            },
            audioUrl: sub.audioUrl,
            duration: sub.duration || 120,
            waveform: sub.waveform || [],
            bpm: typeof sub.bpm === "number" ? sub.bpm : undefined,
            priceTag: "Not For Sale",
            genres: [],
            tags: [],
            flames: typeof sub.flameRating === "number" && sub.flameRating >= 1 ? Math.min(5.0, Math.max(1.0, sub.flameRating)) : undefined,
            juryScore: typeof sub.juryScore === "number" && !isNaN(sub.juryScore) ? Number(sub.juryScore) : undefined,
            battleSource: b.title,
            tier: sub.rank === 1 ? 1 : sub.rank === 2 ? 2 : sub.rank === 3 ? 3 : 4,
            rank: sub.rank,
            createdAt: sub.submittedAt || b.endedAt || new Date().toISOString(),
          });
        });
      });
    } catch {}

    const seenAudios = new Set<string>();
    const seenIds = new Set<string>();
    const allCombined = [...custom, ...battleBeats, ...raw];
    const uniqueBeats: DiscoveryBeat[] = [];

    for (const b of allCombined) {
      if (deleted.includes(b.id)) continue;
      if (b.audioUrl && seenAudios.has(b.audioUrl)) continue;
      if (seenIds.has(b.id)) continue;
      if (b.audioUrl) seenAudios.add(b.audioUrl);
      seenIds.add(b.id);

      let finalTitle = b.title;
      if (/^Beat Battle #\d+$/i.test(finalTitle.trim())) {
        finalTitle = `${finalTitle.trim()} Entry`;
      }

      const prod = producerService.getProducerById(b.beatmaker.id) || producerService.getProducerByTag(b.beatmaker.tag);
      const enrichedBeat: DiscoveryBeat = {
        ...b,
        title: finalTitle,
        beatmaker: {
          id: b.beatmaker.id,
          tag: prod?.nickname || b.beatmaker.tag,
          avatarUrl: prod?.avatarUrl || b.beatmaker.avatarUrl || "/avatars/default-avatar.png",
        },
      };

      uniqueBeats.push(overrides[b.id] ? { ...enrichedBeat, ...overrides[b.id] } : enrichedBeat);
    }

    return uniqueBeats;
  },

  getBeatsByProducer(producerTagOrId: string): DiscoveryBeat[] {
    const clean = producerTagOrId.toLowerCase().trim();
    return this.getAllDiscoveryBeats().filter(
      (b) =>
        b.beatmaker.id.toLowerCase() === clean ||
        b.beatmaker.tag.toLowerCase() === clean
    );
  },

  /**
   * Sync showcase beats from Supabase table
   */
  async syncFromSupabase(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from("beats")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (!error && data) {
        const deletedIds = new Set(loadDeletedBeatIds());
        const mapped: DiscoveryBeat[] = data
          .filter((b) => !deletedIds.has(b.id) && !(b.title && deletedIds.has(b.title.toLowerCase())))
          .map((b) => {
            const prod = producerService.getProducerById(b.producer_id) || producerService.getProducerByTag(b.producer_id);
            return {
              id: b.id,
              title: b.title,
              beatmaker: {
                id: b.producer_id,
                tag: prod?.nickname || b.producer_id,
                avatarUrl: prod?.avatarUrl || "/avatars/default-avatar.png",
              },
              audioUrl: b.audio_url,
              duration: b.duration || 120,
              waveform: Array.isArray(b.waveform) ? b.waveform : [],
              bpm: b.bpm,
              priceTag: b.price_tag || "Not For Sale",
              genres: Array.isArray(b.genres) ? b.genres : [],
              tags: Array.isArray(b.tags) ? b.tags : [],
              flames: b.flames || 0,
              battleSource: b.battle_source,
              tier: b.tier || 4,
              rank: b.rank,
              createdAt: b.created_at,
            };
          });

        saveCustomBeats(mapped);
        notifyBeatsUpdated();
      }
    } catch (err) {
      // console.warn("beatService.syncFromSupabase error:", err);
    }
  },

  updateBeat(id: string, updates: Partial<DiscoveryBeat>): DiscoveryBeat | null {
    if (typeof window !== "undefined") {
      const custom = loadCustomBeats();
      const customIndex = custom.findIndex((b) => b.id === id);
      if (customIndex !== -1) {
        custom[customIndex] = { ...custom[customIndex], ...updates };
        saveCustomBeats(custom);
      } else {
        const overrides = loadBeatOverrides();
        overrides[id] = { ...(overrides[id] || {}), ...updates };
        try {
          localStorage.setItem(STORAGE_KEY_BEAT_OVERRIDES, JSON.stringify(overrides));
        } catch {}
      }
      notifyBeatsUpdated();
    }

    // Async write to Supabase
    supabase.from("beats").update({
      title: updates.title,
      bpm: updates.bpm,
      price_tag: updates.priceTag,
      genres: updates.genres,
      tags: updates.tags,
      audio_url: updates.audioUrl,
    }).eq("id", id).then(
      ({ error }) => {
        // if (error) console.warn("Supabase beat update failed:", error.message);
      },
      () => {}
    );

    const all = this.getAllDiscoveryBeats();
    return all.find((b) => b.id === id) || null;
  },

  deleteBeat(id: string): boolean {
    if (typeof window !== "undefined") {
      const custom = loadCustomBeats();
      const beatToDelete = custom.find((b) => b.id === id);
      const filtered = custom.filter((b) => b.id !== id);
      saveCustomBeats(filtered);

      const deleted = loadDeletedBeatIds();
      if (!deleted.includes(id)) {
        deleted.push(id);
      }
      if (beatToDelete?.title && !deleted.includes(beatToDelete.title.toLowerCase())) {
        deleted.push(beatToDelete.title.toLowerCase());
      }
      try {
        localStorage.setItem(STORAGE_KEY_DELETED_BEATS, JSON.stringify(deleted));
      } catch {}
      notifyBeatsUpdated();
    }

    // Async delete from Supabase
    supabase.from("beats").delete().eq("id", id).then(
      () => {
        notifyBeatsUpdated();
      },
      () => {}
    );

    return true;
  },

  async createBeat(beat: Omit<DiscoveryBeat, "id"> & { id?: string }): Promise<DiscoveryBeat> {
    const newBeat: DiscoveryBeat = {
      ...beat,
      id: beat.id || `beat-custom-${Date.now()}`,
    };

    const custom = loadCustomBeats();
    const updated = [newBeat, ...custom.filter((b) => b.id !== newBeat.id)];
    saveCustomBeats(updated);
    notifyBeatsUpdated();

    try {
      // 1. Ensure producer row exists in public.producers (satisfies foreign key)
      const prod = producerService.getProducerById(newBeat.beatmaker.id) || producerService.getProducerByTag(newBeat.beatmaker.tag);
      if (prod) {
        await supabase.from("producers").upsert({
          id: prod.id,
          nickname: prod.nickname,
          email: prod.email,
          avatar_url: prod.avatarUrl,
          bio: prod.bio || "",
          location: prod.location || "",
          role: prod.role || "producer",
          discord_id: prod.discordId,
          discord_username: prod.discordUsername,
          discord_roles: prod.discordRoles || [],
          links: prod.links || {},
          stats: prod.stats || { battlesEntered: 0, battlesWon: 0, totalFlames: 0 },
          is_claimed: prod.isClaimed || false,
          claimed_at: prod.claimedAt,
          created_at: prod.createdAt || new Date().toISOString(),
        });
      }

      // 2. Insert beat to Supabase beats table
      const { error } = await supabase.from("beats").upsert({
        id: newBeat.id,
        title: newBeat.title,
        producer_id: newBeat.beatmaker.id,
        audio_url: newBeat.audioUrl,
        duration: newBeat.duration || 120,
        waveform: newBeat.waveform || [],
        bpm: newBeat.bpm,
        price_tag: newBeat.priceTag || "Not For Sale",
        genres: newBeat.genres || [],
        tags: newBeat.tags || [],
        flames: newBeat.flames || 0,
        battle_source: newBeat.battleSource,
        tier: newBeat.tier || 4,
        rank: newBeat.rank,
        created_at: newBeat.createdAt || new Date().toISOString(),
      });

      if (error) {
        // console.warn("Supabase beat upsert error:", error.message);
      }
    } catch (err) {
      // console.warn("Supabase beat upsert error:", err);
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

// Initial background sync if in browser
if (typeof window !== "undefined") {
  beatService.syncFromSupabase().catch(() => {});
}
