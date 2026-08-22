import { Competition, BattleSubmission, BattlePhase } from "@/lib/types";
import rawCompetitions from "@/data/competitions.json";
import rawSubmissions from "@/data/submissions.json";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY_BATTLES = "bnp_custom_battles";
const STORAGE_KEY_CUSTOM_SUBS = "bnp_custom_submissions";
const STORAGE_KEY_DELETED_BATTLES = "bnp_deleted_battles";

function loadDeletedBattles(): string[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DELETED_BATTLES);
      if (stored) return JSON.parse(stored);
    } catch {}
  }
  return [];
}

function saveDeletedBattles(ids: string[]) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_DELETED_BATTLES, JSON.stringify(ids));
    } catch {}
  }
}

export function calculateBattlePhase(battle: {
  submissionStartsAt?: string;
  submissionEndsAt?: string;
  ratingEndsAt?: string;
  judgingEndsAt?: string;
  winner?: string;
  phase?: BattlePhase;
}): BattlePhase {
  if (battle.winner && battle.phase === "completed") return "completed";
  const now = Date.now();
  const subStart = battle.submissionStartsAt ? new Date(battle.submissionStartsAt).getTime() : 0;
  const subEnd = battle.submissionEndsAt ? new Date(battle.submissionEndsAt).getTime() : Infinity;
  const ratingEnd = battle.ratingEndsAt ? new Date(battle.ratingEndsAt).getTime() : Infinity;
  const judgingEnd = battle.judgingEndsAt ? new Date(battle.judgingEndsAt).getTime() : Infinity;

  if (now < subEnd) return "submission";
  if (now < ratingEnd) return "rating";
  if (now < judgingEnd) return "judging";
  return "completed";
}

function loadCustomBattles(): Competition[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_BATTLES);
      if (stored) return JSON.parse(stored);
    } catch {}
  }
  return [];
}

function saveCustomBattles(battles: Competition[]) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_BATTLES, JSON.stringify(battles));
    } catch {}
  }
}

function loadCustomSubmissions(): BattleSubmission[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_SUBS);
      if (stored) return JSON.parse(stored);
    } catch {}
  }
  return [];
}

function saveCustomSubmissions(subs: BattleSubmission[]) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_SUBS, JSON.stringify(subs));
    } catch {}
  }
}

let customBattlesList: Competition[] = loadCustomBattles();
const initialCustomIds = new Set(customBattlesList.map((b) => b.id));
let competitionsList: Competition[] = [
  ...customBattlesList,
  ...(rawCompetitions as Competition[]).filter((b) => !initialCustomIds.has(b.id)),
];

let customSubsList: BattleSubmission[] = loadCustomSubmissions();
const initialSubIds = new Set(customSubsList.map((s) => s.id));
let submissionsList: BattleSubmission[] = [
  ...customSubsList,
  ...(rawSubmissions as BattleSubmission[]).filter((s) => !initialSubIds.has(s.id)),
];

export const battleService = {
  getAllCompetitions(): Competition[] {
    let list: Competition[] = [];
    const deletedIds = new Set(loadDeletedBattles());

    if (typeof window !== "undefined") {
      const freshCustom = loadCustomBattles();
      const customIds = new Set(freshCustom.map((b) => b.id));
      const remainingRaw = (rawCompetitions as Competition[]).filter((b) => !customIds.has(b.id));
      list = [...freshCustom, ...remainingRaw];
    } else {
      list = [...competitionsList];
    }

    return list
      .filter((b) => !deletedIds.has(b.id))
      .map((b) => ({
        ...b,
        phase: calculateBattlePhase(b),
      }))
      .sort((a, b) => (b.number || 0) - (a.number || 0));
  },

  getAllBattles(): Competition[] {
    return this.getAllCompetitions();
  },

  getCompetitionById(idOrSlug: string): Competition | undefined {
    return this.getAllCompetitions().find(
      (c) => c.id === idOrSlug || c.slug === idOrSlug
    );
  },

  getBattleById(idOrSlug: string): Competition | undefined {
    return this.getCompetitionById(idOrSlug);
  },

  getBattlesByHost(userEmailOrNickname: string): Competition[] {
    const clean = userEmailOrNickname.toLowerCase().trim();
    return this.getAllCompetitions().filter((b) => {
      const matchHost = b.hosts.some((h) => h.toLowerCase() === clean);
      const matchDetail = b.hostDetails?.some(
        (h) => h.name.toLowerCase() === clean || h.email.toLowerCase() === clean
      );
      return matchHost || matchDetail;
    });
  },

  getActiveBattle(): Competition | undefined {
    return this.getAllCompetitions().find(
      (c) => c.phase === "submission" || c.phase === "rating" || c.phase === "judging"
    );
  },

  getPastBattles(): Competition[] {
    return this.getAllCompetitions().filter((c) => c.phase === "completed");
  },

  /**
   * Sync battles & submissions live from Supabase cloud database
   */
  async syncFromSupabase(): Promise<void> {
    try {
      // 1. Sync Battles
      const { data: dbBattles, error: bErr } = await supabase.from("battles").select("*");
      if (!bErr && dbBattles && dbBattles.length > 0) {
        const mapped: Competition[] = dbBattles.map((b) => ({
          id: b.id,
          number: b.number,
          title: b.title,
          slug: b.slug || b.id,
          coverImage: b.cover_image,
          hosts: b.hosts || [],
          hostDetails: b.host_details || [],
          judges: b.judges || [],
          judgeDetails: b.judge_details || [],
          description: b.description || "",
          prizes: b.prizes || { first: "", second: "", third: "" },
          samples: b.samples || [],
          phase: (b.phase as BattlePhase) || "submission",
          submissionStartsAt: b.submission_starts_at,
          submissionEndsAt: b.submission_ends_at,
          ratingEndsAt: b.rating_ends_at,
          judgingEndsAt: b.judging_ends_at,
          endedAt: b.ended_at,
          totalSubmissions: b.total_submissions || 0,
          minVotesRequired: b.min_votes_required || 5,
          topFinalistsCutoff: b.top_finalists_cutoff || 10,
          youtubeVodUrl: b.youtube_vod_url,
          rules: b.rules || [],
          winner: b.winner,
        }));

        saveCustomBattles(mapped);
        customBattlesList = mapped;
        competitionsList = mapped;
      }

      // 2. Sync Submissions
      const { data: dbSubs, error: sErr } = await supabase.from("submissions").select("*");
      if (!sErr && dbSubs && dbSubs.length > 0) {
        const mappedSubs: BattleSubmission[] = dbSubs.map((s) => ({
          id: s.id,
          battleId: s.battle_id,
          userId: s.user_id,
          beatmakerTag: s.beatmaker_tag,
          beatTitle: s.beat_title,
          audioUrl: s.audio_url,
          waveform: s.waveform,
          duration: s.duration || 120,
          bpm: s.bpm,
          flameRating: s.flame_rating || 0,
          totalVotes: s.total_votes || 0,
          juryScore: s.jury_score,
          juryFeedback: s.jury_feedback,
          judgeName: s.judge_name,
          juryFeedbacks: s.jury_feedbacks || [],
          rank: s.rank,
          submittedAt: s.submitted_at,
        }));

        saveCustomSubmissions(mappedSubs);
        customSubsList = mappedSubs;
        submissionsList = mappedSubs;
      }
    } catch (err) {
      console.warn("battleService.syncFromSupabase error:", err);
    }
  },

  createBattle(battleData: Partial<Competition>): Competition {
    const existing = this.getAllCompetitions();
    const nextNumber = existing.reduce((max, b) => Math.max(max, b.number || 0), 0) + 1;
    
    const computedPhase = calculateBattlePhase({
      submissionStartsAt: battleData.submissionStartsAt,
      submissionEndsAt: battleData.submissionEndsAt,
      ratingEndsAt: battleData.ratingEndsAt,
      judgingEndsAt: battleData.judgingEndsAt,
      winner: battleData.winner,
      phase: battleData.phase,
    });

    const newBattle: Competition = {
      id: battleData.id || `battle-${nextNumber}`,
      number: battleData.number || nextNumber,
      title: battleData.title || `Beat Battle #${nextNumber}`,
      slug: battleData.slug || `beat-battle-${nextNumber}`,
      coverImage: battleData.coverImage || "/covers/default-battle.png",
      hosts: battleData.hosts && battleData.hosts.length > 0 ? battleData.hosts : ["Nerub"],
      hostDetails: battleData.hostDetails,
      judges: battleData.judges || [],
      judgeDetails: battleData.judgeDetails,
      description: battleData.description || "",
      prizes: battleData.prizes || {
        first: "Official Release & Showcase",
        second: "Beats & Pieces Merch Pack",
        third: "Sample Vault Access",
      },
      samples: battleData.samples || [],
      phase: computedPhase,
      submissionStartsAt: battleData.submissionStartsAt || new Date().toISOString(),
      submissionEndsAt: battleData.submissionEndsAt || new Date(Date.now() + 14 * 86400000).toISOString(),
      ratingEndsAt: battleData.ratingEndsAt || new Date(Date.now() + 21 * 86400000).toISOString(),
      judgingEndsAt: battleData.judgingEndsAt || new Date(Date.now() + 28 * 86400000).toISOString(),
      totalSubmissions: 0,
      minVotesRequired: battleData.minVotesRequired || 5,
      topFinalistsCutoff: battleData.topFinalistsCutoff || 15,
      rules: battleData.rules || [],
    };

    const currentCustom = loadCustomBattles();
    const updatedCustom = [newBattle, ...currentCustom.filter((b) => b.id !== newBattle.id)];
    saveCustomBattles(updatedCustom);
    customBattlesList = updatedCustom;
    competitionsList = [...customBattlesList, ...(rawCompetitions as Competition[])];

    // Async write to Supabase
    supabase.from("battles").upsert({
      id: newBattle.id,
      number: newBattle.number,
      title: newBattle.title,
      slug: newBattle.slug,
      cover_image: newBattle.coverImage,
      hosts: newBattle.hosts,
      host_details: newBattle.hostDetails || [],
      judges: newBattle.judges,
      judge_details: newBattle.judgeDetails || [],
      description: newBattle.description,
      prizes: newBattle.prizes,
      samples: newBattle.samples,
      phase: newBattle.phase,
      submission_starts_at: newBattle.submissionStartsAt,
      submission_ends_at: newBattle.submissionEndsAt,
      rating_ends_at: newBattle.ratingEndsAt,
      judging_ends_at: newBattle.judgingEndsAt,
      total_submissions: 0,
      min_votes_required: newBattle.minVotesRequired,
      top_finalists_cutoff: newBattle.topFinalistsCutoff,
      rules: newBattle.rules,
    }).then(
      ({ error }) => {
        if (error) console.warn("Supabase battle insert failed:", error.message);
      },
      () => {}
    );

    return newBattle;
  },

  updateBattle(id: string, updates: Partial<Competition>): Competition | null {
    const all = this.getAllCompetitions();
    const target = all.find((b) => b.id === id);
    if (!target) return null;

    const merged = { ...target, ...updates };
    const computedPhase = calculateBattlePhase(merged);

    const updatedBattle: Competition = {
      ...merged,
      phase: computedPhase,
    };

    const currentCustom = loadCustomBattles();
    const filtered = currentCustom.filter((b) => b.id !== id);
    const updatedCustom = [updatedBattle, ...filtered];
    saveCustomBattles(updatedCustom);
    customBattlesList = updatedCustom;
    competitionsList = [...customBattlesList, ...(rawCompetitions as Competition[])];

    // Async write to Supabase
    supabase.from("battles").upsert({
      id: updatedBattle.id,
      number: updatedBattle.number,
      title: updatedBattle.title,
      slug: updatedBattle.slug,
      cover_image: updatedBattle.coverImage,
      hosts: updatedBattle.hosts,
      host_details: updatedBattle.hostDetails || [],
      judges: updatedBattle.judges,
      judge_details: updatedBattle.judgeDetails || [],
      description: updatedBattle.description,
      prizes: updatedBattle.prizes,
      samples: updatedBattle.samples,
      phase: updatedBattle.phase,
      submission_starts_at: updatedBattle.submissionStartsAt,
      submission_ends_at: updatedBattle.submissionEndsAt,
      rating_ends_at: updatedBattle.ratingEndsAt,
      judging_ends_at: updatedBattle.judgingEndsAt,
      ended_at: updatedBattle.endedAt,
      total_submissions: updatedBattle.totalSubmissions,
      min_votes_required: updatedBattle.minVotesRequired,
      top_finalists_cutoff: updatedBattle.topFinalistsCutoff,
      youtube_vod_url: updatedBattle.youtubeVodUrl,
      rules: updatedBattle.rules,
      winner: updatedBattle.winner,
    }).then(
      ({ error }) => {
        if (error) console.warn("Supabase battle update failed:", error.message);
      },
      () => {}
    );

    return updatedBattle;
  },

  deleteBattle(id: string): boolean {
    // 1. Remove from custom battles if present
    const currentCustom = loadCustomBattles();
    const filtered = currentCustom.filter((b) => b.id !== id);
    saveCustomBattles(filtered);
    customBattlesList = filtered;

    // 2. Add to deleted battles registry
    const deleted = loadDeletedBattles();
    if (!deleted.includes(id)) {
      const updatedDeleted = [...deleted, id];
      saveDeletedBattles(updatedDeleted);
    }

    // 3. Update memory list
    const deletedSet = new Set(loadDeletedBattles());
    competitionsList = [
      ...customBattlesList,
      ...(rawCompetitions as Competition[]).filter((b) => !deletedSet.has(b.id)),
    ];

    // 4. Async delete from Supabase
    supabase.from("battles").delete().eq("id", id).then(
      ({ error }) => {
        if (error) console.warn("Supabase battle delete failed:", error.message);
      },
      () => {}
    );

    return true;
  },

  getSubmissionsByBattleId(battleId: string): BattleSubmission[] {
    if (typeof window !== "undefined") {
      const freshSubs = loadCustomSubmissions();
      const customIds = new Set(freshSubs.map((s) => s.id));
      const remainingRaw = (rawSubmissions as BattleSubmission[]).filter((s) => !customIds.has(s.id));
      return [...freshSubs, ...remainingRaw].filter((s) => s.battleId === battleId);
    }
    return submissionsList.filter((s) => s.battleId === battleId);
  },

  getAllSubmissions(): BattleSubmission[] {
    if (typeof window !== "undefined") {
      const freshSubs = loadCustomSubmissions();
      const customIds = new Set(freshSubs.map((s) => s.id));
      const remainingRaw = (rawSubmissions as BattleSubmission[]).filter((s) => !customIds.has(s.id));
      return [...freshSubs, ...remainingRaw];
    }
    return [...submissionsList];
  },

  submitEntry(newSubmission: BattleSubmission): BattleSubmission {
    const custom = loadCustomSubmissions();
    const filtered = custom.filter((s) => s.id !== newSubmission.id);
    const updated = [newSubmission, ...filtered];
    saveCustomSubmissions(updated);
    customSubsList = updated;
    submissionsList = [newSubmission, ...submissionsList.filter((s) => s.id !== newSubmission.id)];

    // Increment battle submission count
    const battle = this.getBattleById(newSubmission.battleId);
    if (battle) {
      this.updateBattle(battle.id, {
        totalSubmissions: (battle.totalSubmissions || 0) + 1,
      });
    }

    // Async write to Supabase
    supabase.from("submissions").upsert({
      id: newSubmission.id,
      battle_id: newSubmission.battleId,
      user_id: newSubmission.userId,
      beatmaker_tag: newSubmission.beatmakerTag,
      beat_title: newSubmission.beatTitle,
      audio_url: newSubmission.audioUrl,
      waveform: newSubmission.waveform || [],
      duration: newSubmission.duration || 120,
      bpm: newSubmission.bpm,
      flame_rating: newSubmission.flameRating || 0,
      total_votes: newSubmission.totalVotes || 0,
      jury_score: newSubmission.juryScore,
      jury_feedback: newSubmission.juryFeedback,
      judge_name: newSubmission.judgeName,
      jury_feedbacks: newSubmission.juryFeedbacks || [],
      rank: newSubmission.rank,
      submitted_at: newSubmission.submittedAt || new Date().toISOString(),
    }).then(
      ({ error }) => {
        if (error) console.warn("Supabase submission insert failed:", error.message);
      },
      () => {}
    );

    return newSubmission;
  },

  async voteSubmission(
    submissionId: string,
    battleId: string,
    voterId: string,
    score: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from("ratings").upsert(
        {
          battle_id: battleId,
          submission_id: submissionId,
          voter_id: voterId,
          score: score,
        },
        { onConflict: "submission_id,voter_id" }
      );

      if (error) {
        console.warn("Supabase voteSubmission failed:", error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to vote" };
    }
  },
};

// Initial background sync if in browser
if (typeof window !== "undefined") {
  battleService.syncFromSupabase().catch(() => {});
}
