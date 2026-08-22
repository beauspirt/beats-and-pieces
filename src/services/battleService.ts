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

export function notifyBattlesUpdated() {
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("bnp_battles_updated"));
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
  if (battle.phase === "completed") return "completed";
  const now = Date.now();
  const subEnd = battle.submissionEndsAt ? new Date(battle.submissionEndsAt).getTime() : NaN;
  const ratingEnd = battle.ratingEndsAt ? new Date(battle.ratingEndsAt).getTime() : NaN;

  if (!isNaN(subEnd) && now < subEnd) return "submission";
  if (!isNaN(ratingEnd) && now < ratingEnd) return "rating";

  // Once rating ends, the battle enters judging phase (Phase 3).
  // Phase 3 has no deadline: it stays in judging until all assigned judges submit their scores.
  if (battle.phase === "judging" || (!isNaN(ratingEnd) && now >= ratingEnd)) {
    return "judging";
  }

  if (battle.phase && ["submission", "rating", "judging", "completed"].includes(battle.phase)) {
    return battle.phase;
  }

  return "submission";
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

        // Clean up deleted list for any active server battles
        const currentDeleted = loadDeletedBattles();
        const serverIds = new Set(mapped.map((b) => b.id));
        const prunedDeleted = currentDeleted.filter((id) => !serverIds.has(id));
        saveDeletedBattles(prunedDeleted);

        // Merge with any local custom battles not yet synced to Supabase
        const currentCustom = loadCustomBattles();
        const unsyncedCustom = currentCustom.filter((b) => !serverIds.has(b.id) && !prunedDeleted.includes(b.id));
        const mergedCustom = [...mapped, ...unsyncedCustom];

        saveCustomBattles(mergedCustom);
        customBattlesList = mergedCustom;
        competitionsList = mergedCustom;
        notifyBattlesUpdated();
      }

      // 2. Sync Submissions & Ratings
      const [{ data: dbSubs, error: sErr }, { data: dbRatings }] = await Promise.all([
        supabase.from("submissions").select("*"),
        supabase.from("ratings").select("*"),
      ]);

      // Calculate rating stats from ratings table
      const ratingStats: Record<string, { totalScore: number; count: number }> = {};
      if (dbRatings && dbRatings.length > 0) {
        dbRatings.forEach((r: any) => {
          if (!ratingStats[r.submission_id]) {
            ratingStats[r.submission_id] = { totalScore: 0, count: 0 };
          }
          ratingStats[r.submission_id].totalScore += (Number(r.score) || 0);
          ratingStats[r.submission_id].count += 1;
        });
      }

      if (!sErr && dbSubs && dbSubs.length > 0) {
        const mappedSubs: BattleSubmission[] = dbSubs.map((s) => {
          const stats = ratingStats[s.id];
          const calcFlame = stats && stats.count > 0 ? Number((stats.totalScore / stats.count).toFixed(2)) : (s.flame_rating || 0);
          const calcVotes = stats && stats.count > 0 ? stats.count : (s.total_votes || 0);

          const feedbacks = s.jury_feedbacks || [];
          const scoredFeedbacks = feedbacks.filter((f: any) => typeof f.score === "number" && !isNaN(f.score));
          let calculatedJuryScore = typeof s.jury_score === "number" ? s.jury_score : undefined;
          if (scoredFeedbacks.length > 0) {
            const sum = scoredFeedbacks.reduce((acc: number, cur: any) => acc + (Number(cur.score) || 0), 0);
            calculatedJuryScore = Number((sum / scoredFeedbacks.length).toFixed(2));
          }

          return {
            id: s.id,
            battleId: s.battle_id,
            userId: s.user_id,
            beatmakerTag: s.beatmaker_tag,
            beatTitle: s.beat_title,
            audioUrl: s.audio_url,
            waveform: s.waveform,
            duration: s.duration || 120,
            bpm: s.bpm,
            flameRating: calcFlame,
            totalVotes: calcVotes,
            juryScore: calculatedJuryScore,
            juryFeedback: s.jury_feedback,
            judgeName: s.judge_name,
            juryFeedbacks: s.jury_feedbacks || [],
            rank: s.rank,
            submittedAt: s.submitted_at,
          };
        });

        // Compute rankings & auto-assign winner for completed battles
        const allBattles = this.getAllCompetitions();
        let battlesModified = false;

        for (const b of allBattles) {
          const bSubs = mappedSubs.filter((s) => s.battleId === b.id);
          if (bSubs.length > 0) {
            // Sort strictly by juryScore average (highest first)
            const sorted = [...bSubs].sort((a, b) => {
              const aJury = typeof a.juryScore === "number" ? a.juryScore : -1;
              const bJury = typeof b.juryScore === "number" ? b.juryScore : -1;
              return bJury - aJury;
            });

            sorted.forEach((sub, idx) => {
              if (!sub.rank) sub.rank = idx + 1;
            });

            if (b.phase === "completed" && (!b.winner || b.winner === "TBD") && sorted[0]) {
              b.winner = sorted[0].beatmakerTag;
              battlesModified = true;
            }
          }
        }

        if (battlesModified) {
          saveCustomBattles(allBattles);
          customBattlesList = allBattles;
          competitionsList = allBattles;
          notifyBattlesUpdated();
        }

        saveCustomSubmissions(mappedSubs);
        customSubsList = mappedSubs;
        submissionsList = mappedSubs;
      }
    } catch (err) {
      console.warn("battleService.syncFromSupabase error:", err);
    }
  },

  async createBattle(battleData: Partial<Competition>): Promise<Competition> {
    const existing = this.getAllCompetitions();
    const nextNumber = existing.reduce((max, b) => Math.max(max, b.number || 0), 0) + 1;
    
    const submissionStartsAt = battleData.submissionStartsAt || new Date().toISOString();
    const submissionEndsAt = battleData.submissionEndsAt || new Date(Date.now() + 14 * 86400000).toISOString();
    const ratingEndsAt = battleData.ratingEndsAt || new Date(Date.now() + 21 * 86400000).toISOString();
    const judgingEndsAt = battleData.judgingEndsAt || new Date(Date.now() + 28 * 86400000).toISOString();

    const computedPhase = calculateBattlePhase({
      submissionStartsAt,
      submissionEndsAt,
      ratingEndsAt,
      judgingEndsAt,
      winner: battleData.winner,
      phase: battleData.phase || "submission",
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
      submissionStartsAt,
      submissionEndsAt,
      ratingEndsAt,
      judgingEndsAt,
      totalSubmissions: 0,
      minVotesRequired: battleData.minVotesRequired || 5,
      topFinalistsCutoff: battleData.topFinalistsCutoff || 15,
      rules: battleData.rules || [],
    };

    // Remove from deleted list if previously deleted
    const deleted = loadDeletedBattles();
    if (deleted.includes(newBattle.id)) {
      saveDeletedBattles(deleted.filter((id) => id !== newBattle.id));
    }

    const currentCustom = loadCustomBattles();
    const updatedCustom = [newBattle, ...currentCustom.filter((b) => b.id !== newBattle.id)];
    saveCustomBattles(updatedCustom);
    customBattlesList = updatedCustom;
    competitionsList = [...customBattlesList, ...(rawCompetitions as Competition[])];
    notifyBattlesUpdated();

    // Write to Supabase
    try {
      const { error } = await supabase.from("battles").upsert({
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
      });
      if (error) console.warn("Supabase battle insert error:", error.message);
    } catch (err) {
      console.warn("Supabase battle insert exception:", err);
    }

    return newBattle;
  },

  async updateBattle(id: string, updates: Partial<Competition>): Promise<Competition | null> {
    const all = this.getAllCompetitions();
    const target = all.find((b) => b.id === id);
    if (!target) return null;

    const merged = { ...target, ...updates };
    const computedPhase = calculateBattlePhase(merged);

    const updatedBattle: Competition = {
      ...merged,
      phase: computedPhase,
    };

    // Remove from deleted list if present
    const deleted = loadDeletedBattles();
    if (deleted.includes(id)) {
      saveDeletedBattles(deleted.filter((delId) => delId !== id));
    }

    const currentCustom = loadCustomBattles();
    const filtered = currentCustom.filter((b) => b.id !== id);
    const updatedCustom = [updatedBattle, ...filtered];
    saveCustomBattles(updatedCustom);
    customBattlesList = updatedCustom;
    competitionsList = [...customBattlesList, ...(rawCompetitions as Competition[])];
    notifyBattlesUpdated();

    // Write to Supabase
    try {
      const { error } = await supabase.from("battles").upsert({
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
      });
      if (error) console.warn("Supabase battle update error:", error.message);
    } catch (err) {
      console.warn("Supabase battle update exception:", err);
    }

    return updatedBattle;
  },

  async deleteBattle(id: string): Promise<boolean> {
    // 1. Remove from custom battles if present
    const currentCustom = loadCustomBattles();
    const filtered = currentCustom.filter((b) => b.id !== id);
    saveCustomBattles(filtered);
    customBattlesList = filtered;

    // 2. Add to deleted tracking list
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
    notifyBattlesUpdated();

    // 4. Delete from Supabase
    try {
      await supabase.from("battles").delete().eq("id", id);
    } catch (err) {
      console.warn("Supabase delete battle exception:", err);
    }

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
    const battle = this.getBattleById(newSubmission.battleId);
    if (battle) {
      const isJudge =
        battle.judgeDetails?.some(
          (j) =>
            (j.email && j.email.toLowerCase() === newSubmission.userId.toLowerCase()) ||
            (j.name && j.name.toLowerCase() === newSubmission.userId.toLowerCase())
        ) ||
        battle.judges?.some(
          (j) =>
            typeof j === "string" &&
            (j.toLowerCase() === newSubmission.userId.toLowerCase() ||
              j.toLowerCase() === newSubmission.beatmakerTag?.toLowerCase())
        );

      if (isJudge) {
        throw new Error("Judges cannot submit entries to battles they are assigned to judge.");
      }
    }

    const custom = loadCustomSubmissions();
    // Filter out any previous submission with the same ID OR from the same user in the same battle
    const filtered = custom.filter(
      (s) => s.id !== newSubmission.id && !(s.battleId === newSubmission.battleId && s.userId === newSubmission.userId)
    );
    const updated = [newSubmission, ...filtered];
    saveCustomSubmissions(updated);
    customSubsList = updated;
    submissionsList = [
      newSubmission,
      ...submissionsList.filter(
        (s) => s.id !== newSubmission.id && !(s.battleId === newSubmission.battleId && s.userId === newSubmission.userId)
      ),
    ];

    // Recalculate battle submission count accurately
    if (battle) {
      const count = this.getSubmissionsByBattleId(battle.id).length;
      this.updateBattle(battle.id, {
        totalSubmissions: count,
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

    notifyBattlesUpdated();
    return newSubmission;
  },

  async deleteSubmission(submissionId: string, battleId?: string, userId?: string): Promise<boolean> {
    try {
      const custom = loadCustomSubmissions();
      const target = custom.find((s) => s.id === submissionId) || submissionsList.find((s) => s.id === submissionId);
      const bId = battleId || target?.battleId;
      const uId = userId || target?.userId;

      const filteredCustom = custom.filter((s) => s.id !== submissionId && !(uId && bId && s.userId === uId && s.battleId === bId));
      saveCustomSubmissions(filteredCustom);
      customSubsList = filteredCustom;
      submissionsList = submissionsList.filter((s) => s.id !== submissionId && !(uId && bId && s.userId === uId && s.battleId === bId));

      if (bId) {
        const battle = this.getBattleById(bId);
        if (battle) {
          const count = this.getSubmissionsByBattleId(bId).length;
          this.updateBattle(bId, { totalSubmissions: count });
        }
      }

      // Delete from Supabase submissions & ratings tables
      const deletePromises = [
        Promise.resolve(supabase.from("submissions").delete().eq("id", submissionId)),
        Promise.resolve(supabase.from("ratings").delete().eq("submission_id", submissionId)),
      ];

      if (uId && bId) {
        deletePromises.push(
          Promise.resolve(supabase.from("submissions").delete().eq("user_id", uId).eq("battle_id", bId))
        );
      }

      await Promise.all(deletePromises);

      notifyBattlesUpdated();
      return true;
    } catch (err) {
      console.warn("deleteSubmission error:", err);
      return false;
    }
  },

  async voteSubmission(
    submissionId: string,
    battleId: string,
    voterId: string,
    score: number
  ): Promise<{ success: boolean; error?: string }> {
    // Draft rating: save locally in user's browser without prematurely mutating public averages
    return { success: true };
  },

  async submitUserRatings(
    battleId: string,
    voterId: string,
    userRatings: Record<string, number>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Upsert all user votes to Supabase ratings table
      const upsertRows = Object.entries(userRatings).map(([submissionId, score]) => ({
        battle_id: battleId,
        submission_id: submissionId,
        voter_id: voterId,
        score: score,
      }));

      if (upsertRows.length > 0) {
        await supabase.from("ratings").upsert(upsertRows, { onConflict: "submission_id,voter_id" });
      }

      // 2. Fetch all ratings for this battle to accurately recompute flame averages
      const { data: dbRatings } = await supabase
        .from("ratings")
        .select("submission_id, score")
        .eq("battle_id", battleId);

      const ratingStats: Record<string, { totalScore: number; count: number }> = {};
      if (dbRatings && dbRatings.length > 0) {
        dbRatings.forEach((r: any) => {
          if (!ratingStats[r.submission_id]) {
            ratingStats[r.submission_id] = { totalScore: 0, count: 0 };
          }
          ratingStats[r.submission_id].totalScore += (Number(r.score) || 0);
          ratingStats[r.submission_id].count += 1;
        });
      }

      // 3. Update all submissions in memory & Supabase
      const allSubs = this.getAllSubmissions();
      for (const sub of allSubs) {
        if (sub.battleId === battleId) {
          const stats = ratingStats[sub.id];
          sub.flameRating = stats && stats.count > 0 ? Number((stats.totalScore / stats.count).toFixed(2)) : 0;
          sub.totalVotes = stats && stats.count > 0 ? stats.count : 0;

          await supabase.from("submissions").update({
            flame_rating: sub.flameRating,
            total_votes: sub.totalVotes,
          }).eq("id", sub.id);
        }
      }

      saveCustomSubmissions(allSubs);
      customSubsList = allSubs;
      submissionsList = allSubs;

      notifyBattlesUpdated();
      return { success: true };
    } catch (err: any) {
      console.error("submitUserRatings error:", err);
      return { success: false, error: err.message };
    }
  },

  async unlockUserRatings(
    battleId: string,
    voterId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Delete all rows from Supabase ratings table for this user & battle
      await supabase
        .from("ratings")
        .delete()
        .eq("battle_id", battleId)
        .eq("voter_id", voterId);

      // 2. Re-fetch all remaining ratings for this battle to recompute flame averages without this user's votes
      const { data: dbRatings } = await supabase
        .from("ratings")
        .select("submission_id, score")
        .eq("battle_id", battleId);

      const ratingStats: Record<string, { totalScore: number; count: number }> = {};
      if (dbRatings && dbRatings.length > 0) {
        dbRatings.forEach((r: any) => {
          if (!ratingStats[r.submission_id]) {
            ratingStats[r.submission_id] = { totalScore: 0, count: 0 };
          }
          ratingStats[r.submission_id].totalScore += (Number(r.score) || 0);
          ratingStats[r.submission_id].count += 1;
        });
      }

      // 3. Update all submissions in memory & Supabase
      const allSubs = this.getAllSubmissions();
      for (const sub of allSubs) {
        if (sub.battleId === battleId) {
          const stats = ratingStats[sub.id];
          sub.flameRating = stats && stats.count > 0 ? Number((stats.totalScore / stats.count).toFixed(2)) : 0;
          sub.totalVotes = stats && stats.count > 0 ? stats.count : 0;

          await supabase.from("submissions").update({
            flame_rating: sub.flameRating,
            total_votes: sub.totalVotes,
          }).eq("id", sub.id);
        }
      }

      saveCustomSubmissions(allSubs);
      customSubsList = allSubs;
      submissionsList = allSubs;

      notifyBattlesUpdated();
      return { success: true };
    } catch (err: any) {
      console.error("unlockUserRatings error:", err);
      return { success: false, error: err.message };
    }
  },

  async getUserRatingsForBattle(
    battleId: string,
    userId: string
  ): Promise<{ ratings: Record<string, number>; isSubmitted: boolean }> {
    if (!userId || !battleId) return { ratings: {}, isSubmitted: false };

    let localRatings: Record<string, number> = {};
    let isSubmitted = false;

    // 1. Read from localStorage
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`bnp_ratings_${battleId}_${userId}`);
        if (stored) localRatings = JSON.parse(stored);
        const subFlag = localStorage.getItem(`bnp_submitted_ratings_${battleId}_${userId}`);
        if (subFlag === "true" && Object.keys(localRatings).length > 0) {
          isSubmitted = true;
        }
      } catch {}
    }

    // 2. Fetch from Supabase ratings table if local draft is empty
    if (Object.keys(localRatings).length === 0) {
      try {
        const { data: dbRatings } = await supabase
          .from("ratings")
          .select("submission_id, score")
          .eq("battle_id", battleId)
          .eq("voter_id", userId);

        if (dbRatings && dbRatings.length > 0) {
          dbRatings.forEach((r: any) => {
            if (r.submission_id && typeof r.score === "number") {
              localRatings[r.submission_id] = r.score;
            }
          });
        }
      } catch (err) {
        console.warn("getUserRatingsForBattle error:", err);
      }
    }

    return { ratings: localRatings, isSubmitted };
  },

  async submitJuryBallot(
    battleId: string,
    judgeId: string,
    judgeName: string,
    scores: Record<string, number | string>,
    feedbacks: Record<string, string>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const battleSubs = this.getSubmissionsByBattleId(battleId);
      if (battleSubs.length === 0) return { success: true };

      const battle = this.getBattleById(battleId);

      for (const sub of battleSubs) {
        const scoreVal = scores[sub.id];
        const feedbackVal = feedbacks[sub.id];
        const parsedScore = (scoreVal !== undefined && scoreVal !== "") ? parseFloat(String(scoreVal)) : null;

        const cleanJudgeName = judgeName.toLowerCase().trim();
        const cleanJudgeId = judgeId.toLowerCase().trim();
        const existingFeedbacks = sub.juryFeedbacks ? [...sub.juryFeedbacks] : [];
        const filteredFeedbacks = existingFeedbacks.filter(
          (f) =>
            (f.judgeName ? f.judgeName.toLowerCase().trim() : "") !== cleanJudgeName &&
            (f.judgeId ? f.judgeId.toLowerCase().trim() : "") !== cleanJudgeId
        );

        if (parsedScore !== null || (feedbackVal && feedbackVal.trim())) {
          filteredFeedbacks.push({
            judgeId,
            judgeName,
            score: parsedScore !== null ? parsedScore : undefined,
            feedback: feedbackVal ? feedbackVal.trim() : "",
          });
        }
        sub.juryFeedbacks = filteredFeedbacks;

        // Calculate mathematical average of all jury scores for this track
        const scoredItems = sub.juryFeedbacks.filter(
          (f) => typeof f.score === "number" && !isNaN(f.score)
        );
        if (scoredItems.length > 0) {
          const sum = scoredItems.reduce((acc, cur) => acc + (Number(cur.score) || 0), 0);
          sub.juryScore = Number((sum / scoredItems.length).toFixed(2));
        } else if (parsedScore !== null) {
          sub.juryScore = parsedScore;
        } else {
          sub.juryScore = 0;
        }

        if (feedbackVal && feedbackVal.trim()) {
          sub.juryFeedback = feedbackVal.trim();
          sub.judgeName = judgeName;
        }
      }

      // Rank submissions strictly by juryScore average (highest to lowest)
      const ranked = [...battleSubs].sort((a, b) => {
        const aJury = typeof a.juryScore === "number" ? a.juryScore : -1;
        const bJury = typeof b.juryScore === "number" ? b.juryScore : -1;
        return bJury - aJury;
      });

      ranked.forEach((s, idx) => {
        s.rank = idx + 1;
      });

      // Update in-memory and local storage
      const allSubs = this.getAllSubmissions();
      const updatedAllSubs = allSubs.map((s) => {
        const match = ranked.find((r) => r.id === s.id);
        return match || s;
      });
      saveCustomSubmissions(updatedAllSubs);
      customSubsList = updatedAllSubs;
      submissionsList = updatedAllSubs;

      // Determine if all assigned judges have submitted their ballots
      const assignedJudges = (
        battle?.judgeDetails && battle.judgeDetails.length > 0
          ? battle.judgeDetails
          : (battle?.judges || []).map((j) => ({ name: typeof j === "string" ? j : "", email: "" }))
      ).filter((j) => (j.name && j.name.trim()) || (j.email && j.email.trim()));

      const submittedJudgesSet = new Set<string>();
      battleSubs.forEach((s) => {
        s.juryFeedbacks?.forEach((f) => {
          if (typeof f.score === "number" && f.judgeName) {
            submittedJudgesSet.add(f.judgeName.toLowerCase().trim());
            if (f.judgeId) submittedJudgesSet.add(f.judgeId.toLowerCase().trim());
          }
        });
      });

      // Results phase is reached ONLY when ALL assigned judges have submitted their scores
      const allJudgesFinished =
        assignedJudges.length > 0 &&
        assignedJudges.every(
          (j) =>
            (j.name && submittedJudgesSet.has(j.name.toLowerCase().trim())) ||
            (j.email && submittedJudgesSet.has(j.email.toLowerCase().trim()))
        );

      if (allJudgesFinished) {
        // Automatically transition battle to completed Results phase
        await this.updateBattle(battleId, {
          phase: "completed",
          winner: ranked[0]?.beatmakerTag || battle?.winner,
          endedAt: new Date().toISOString(),
        });
      }

      // Upsert updated submissions to Supabase
      for (const sub of ranked) {
        await supabase.from("submissions").upsert({
          id: sub.id,
          battle_id: sub.battleId,
          user_id: sub.userId,
          beatmaker_tag: sub.beatmakerTag,
          beat_title: sub.beatTitle,
          audio_url: sub.audioUrl,
          waveform: sub.waveform || [],
          duration: sub.duration || 120,
          bpm: sub.bpm,
          flame_rating: sub.flameRating || 0,
          total_votes: sub.totalVotes || 0,
          jury_score: sub.juryScore,
          jury_feedback: sub.juryFeedback,
          judge_name: sub.judgeName,
          jury_feedbacks: sub.juryFeedbacks || [],
          rank: sub.rank,
          submitted_at: sub.submittedAt,
        });
      }

      notifyBattlesUpdated();
      return { success: true };
    } catch (err: any) {
      console.error("submitJuryBallot error:", err);
      return { success: false, error: err.message || "Failed to submit jury ballot" };
    }
  },

  async unsubmitJuryBallot(
    battleId: string,
    judgeId: string,
    judgeName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const battleSubs = this.getSubmissionsByBattleId(battleId);
      if (battleSubs.length === 0) return { success: true };

      const cleanJudgeName = judgeName.toLowerCase().trim();
      const cleanJudgeId = judgeId.toLowerCase().trim();

      for (const sub of battleSubs) {
        const existingFeedbacks = sub.juryFeedbacks ? [...sub.juryFeedbacks] : [];
        // Remove this judge's score entry so they count as unsubmitted / in progress
        const filteredFeedbacks = existingFeedbacks.filter(
          (f) =>
            (f.judgeName ? f.judgeName.toLowerCase().trim() : "") !== cleanJudgeName &&
            (f.judgeId ? f.judgeId.toLowerCase().trim() : "") !== cleanJudgeId
        );
        sub.juryFeedbacks = filteredFeedbacks;

        // Recalculate mathematical average from remaining judges
        const scoredItems = sub.juryFeedbacks.filter(
          (f) => typeof f.score === "number" && !isNaN(f.score)
        );
        if (scoredItems.length > 0) {
          const sum = scoredItems.reduce((acc, cur) => acc + (Number(cur.score) || 0), 0);
          sub.juryScore = Number((sum / scoredItems.length).toFixed(2));
        } else {
          delete sub.juryScore;
        }

        if (sub.judgeName && sub.judgeName.toLowerCase().trim() === cleanJudgeName) {
          delete sub.juryFeedback;
          delete sub.judgeName;
        }
      }

      // Re-rank submissions
      const ranked = [...battleSubs].sort((a, b) => {
        const aJury = typeof a.juryScore === "number" ? a.juryScore : -1;
        const bJury = typeof b.juryScore === "number" ? b.juryScore : -1;
        return bJury - aJury;
      });

      ranked.forEach((s, idx) => {
        s.rank = idx + 1;
      });

      // Update in-memory and local storage
      const allSubs = this.getAllSubmissions();
      const updatedAllSubs = allSubs.map((s) => {
        const match = ranked.find((r) => r.id === s.id);
        return match || s;
      });
      saveCustomSubmissions(updatedAllSubs);
      customSubsList = updatedAllSubs;
      submissionsList = updatedAllSubs;

      // Revert battle phase back to "judging" if it was prematurely completed
      const battle = this.getBattleById(battleId);
      if (battle && battle.phase === "completed") {
        await this.updateBattle(battleId, { phase: "judging" });
      }

      // Upsert updated submissions to Supabase
      for (const sub of ranked) {
        await supabase.from("submissions").upsert({
          id: sub.id,
          battle_id: sub.battleId,
          user_id: sub.userId,
          beatmaker_tag: sub.beatmakerTag,
          beat_title: sub.beatTitle,
          audio_url: sub.audioUrl,
          waveform: sub.waveform || [],
          duration: sub.duration || 120,
          bpm: sub.bpm,
          flame_rating: sub.flameRating || 0,
          total_votes: sub.totalVotes || 0,
          jury_score: sub.juryScore || null,
          jury_feedback: sub.juryFeedback || null,
          judge_name: sub.judgeName || null,
          jury_feedbacks: sub.juryFeedbacks || [],
          rank: sub.rank,
          submitted_at: sub.submittedAt,
        });
      }

      notifyBattlesUpdated();
      return { success: true };
    } catch (err: any) {
      console.warn("unsubmitJuryBallot error:", err);
      return { success: false, error: err.message || "Failed to unsubmit jury ballot" };
    }
  },
};

// Initial background sync if in browser
if (typeof window !== "undefined") {
  battleService.syncFromSupabase().catch(() => {});
}
