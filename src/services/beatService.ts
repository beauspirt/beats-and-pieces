import { DiscoveryBeat } from "@/lib/types";
import rawDiscoveryBeats from "@/data/discovery-beats.json";
import { supabase } from "@/lib/supabase";
import { battleService } from "./battleService";
import { producerService } from "./producerService";
import { activityLogService } from "./activityLogService";

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

export function normalizeBeatTags(tags: string[] | undefined): string[] {
  if (!Array.isArray(tags)) return [];
  const normalized: string[] = [];
  tags.forEach((t) => {
    if (typeof t === "string") {
      if (t.includes("/")) {
        t.split("/").forEach((part) => {
          const trimmed = part.trim();
          if (trimmed && !normalized.includes(trimmed)) normalized.push(trimmed);
        });
      } else {
        const trimmed = t.trim();
        if (trimmed && !normalized.includes(trimmed)) normalized.push(trimmed);
      }
    }
  });
  return normalized;
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
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter((id) => typeof id === "string" && id.startsWith("disc-bb"));
        }
      }
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
            juryFeedbacks: sub.juryFeedbacks || [],
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
        tags: normalizeBeatTags(b.tags),
        genres: normalizeBeatTags(b.genres),
        beatmaker: {
          id: b.beatmaker.id,
          tag: prod?.nickname || b.beatmaker.tag,
          avatarUrl: prod?.avatarUrl || b.beatmaker.avatarUrl || "/avatars/default-avatar.png",
        },
      };

      const finalBeat = overrides[b.id] ? { ...enrichedBeat, ...overrides[b.id] } : enrichedBeat;
      if (finalBeat.tags) finalBeat.tags = normalizeBeatTags(finalBeat.tags);
      if (finalBeat.genres) finalBeat.genres = normalizeBeatTags(finalBeat.genres);
      uniqueBeats.push(finalBeat);
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
        const mapped: DiscoveryBeat[] = data.map((b) => {
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
            genres: normalizeBeatTags(b.genres),
            tags: normalizeBeatTags(b.tags),
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
    const all = this.getAllDiscoveryBeats();
    const existing = all.find((b) => b.id === id);
    if (!existing) return null;

    const safeTags = updates.tags !== undefined
      ? normalizeBeatTags(Array.isArray(updates.tags) ? updates.tags : [])
      : normalizeBeatTags(existing.tags || []);

    const mergedBeat: DiscoveryBeat = {
      ...existing,
      ...updates,
      tags: safeTags,
    };

    if (typeof window !== "undefined") {
      const custom = loadCustomBeats();
      const customIndex = custom.findIndex((b) => b.id === id);
      if (customIndex !== -1) {
        custom[customIndex] = mergedBeat;
      } else {
        custom.unshift(mergedBeat);
      }
      saveCustomBeats(custom);
      notifyBeatsUpdated();
    }

    // Async upsert to Supabase public.beats so changes are authoritative for all users
    supabase.from("beats").upsert({
      id: mergedBeat.id,
      title: mergedBeat.title,
      producer_id: mergedBeat.beatmaker.id,
      audio_url: mergedBeat.audioUrl,
      duration: mergedBeat.duration || 120,
      waveform: mergedBeat.waveform || [],
      bpm: mergedBeat.bpm,
      price_tag: mergedBeat.priceTag || "Not For Sale",
      genres: mergedBeat.genres || [],
      tags: safeTags,
      flames: mergedBeat.flames || 0,
      battle_source: mergedBeat.battleSource,
      tier: mergedBeat.tier || 4,
      rank: mergedBeat.rank,
      created_at: mergedBeat.createdAt || new Date().toISOString(),
    }).then(
      () => {
        notifyBeatsUpdated();
      },
      () => {}
    );

    // If this is a battle submission, also sync to submissions table
    if (id.startsWith("sub-")) {
      const rawSubId = id.replace(/^sub-/, "");
      supabase.from("submissions").update({
        bpm: mergedBeat.bpm,
        beat_title: mergedBeat.title,
      }).or(`id.eq.${id},id.eq.${rawSubId}`).then(() => {}, () => {});
    }

    return mergedBeat;
  },

  deleteBeat(id: string): boolean {
    if (typeof window !== "undefined") {
      const custom = loadCustomBeats();
      const filtered = custom.filter((b) => b.id !== id);
      saveCustomBeats(filtered);

      if (id.startsWith("disc-bb")) {
        const deleted = loadDeletedBeatIds();
        if (!deleted.includes(id)) {
          deleted.push(id);
          try {
            localStorage.setItem(STORAGE_KEY_DELETED_BEATS, JSON.stringify(deleted));
          } catch {}
        }
      }
      notifyBeatsUpdated();
    }

    // Async delete from Supabase
    supabase.from("beats").delete().eq("id", id).then(
      () => {
        notifyBeatsUpdated();
      },
      () => {}
    );

    activityLogService.logActivity({
      type: "beat.delete",
      description: `Deleted showcase beat #${id}`,
      metadata: { beatId: id },
    });

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

    activityLogService.logActivity({
      type: "beat.upload",
      userId: newBeat.beatmaker.id,
      userNickname: newBeat.beatmaker.tag,
      userAvatar: newBeat.beatmaker.avatarUrl,
      description: `Uploaded showcase beat '${newBeat.title}' (${newBeat.bpm ? newBeat.bpm + " BPM" : "Custom BPM"})`,
      metadata: {
        beatId: newBeat.id,
        title: newBeat.title,
        bpm: newBeat.bpm,
        priceTag: newBeat.priceTag,
        tags: newBeat.tags,
      },
    });

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
