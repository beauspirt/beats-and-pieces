import { Competition, BattleSubmission } from "@/lib/types";
import rawCompetitions from "@/data/competitions.json";
import rawSubmissions from "@/data/submissions.json";

let competitionsList: Competition[] = [...(rawCompetitions as Competition[])];
let submissionsList: BattleSubmission[] = [...(rawSubmissions as BattleSubmission[])];

export const battleService = {
  getAllCompetitions(): Competition[] {
    return [...competitionsList];
  },

  getCompetitionById(idOrSlug: string): Competition | undefined {
    return competitionsList.find(
      (c) => c.id === idOrSlug || c.slug === idOrSlug
    );
  },

  getActiveBattle(): Competition | undefined {
    return competitionsList.find(
      (c) => c.phase === "submission" || c.phase === "rating" || c.phase === "judging"
    );
  },

  getPastBattles(): Competition[] {
    return competitionsList.filter((c) => c.phase === "completed");
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
