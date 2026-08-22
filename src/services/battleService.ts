import { Competition, BattleSubmission, BattlePhase } from "@/lib/types";
import rawCompetitions from "@/data/competitions.json";
import rawSubmissions from "@/data/submissions.json";

const STORAGE_KEY_BATTLES = "bnp_custom_battles";
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
      if (stored) {
        return JSON.parse(stored);
      }
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

let customBattlesList: Competition[] = loadCustomBattles();
const initialCustomIds = new Set(customBattlesList.map((b) => b.id));
let competitionsList: Competition[] = [
  ...customBattlesList,
  ...(rawCompetitions as Competition[]).filter((b) => !initialCustomIds.has(b.id)),
];
let submissionsList: BattleSubmission[] = [...(rawSubmissions as BattleSubmission[])];

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
      coverImage: battleData.coverImage || "/covers/beat-battle-8.png",
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

    return true;
  },

  getSubmissionsByBattleId(battleId: string): BattleSubmission[] {
    return submissionsList.filter((s) => s.battleId === battleId);
  },

  getAllSubmissions(): BattleSubmission[] {
    return [...submissionsList];
  },

  submitEntry(newSubmission: BattleSubmission): BattleSubmission {
    submissionsList = [newSubmission, ...submissionsList];
    return newSubmission;
  },
};
