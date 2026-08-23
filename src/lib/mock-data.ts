import { UserProfile, Competition, BattleSubmission, DiscoveryBeat, Release } from "@/lib/types";
import {
  producerService,
  battleService,
  releaseService,
  beatService,
} from "@/services";

export const sampleProducers: Record<string, UserProfile> = producerService.getProducersMap();
export const currentUser: UserProfile = sampleProducers["nerub"] || Object.values(sampleProducers)[0];
export const sampleCompetitions: Competition[] = battleService.getAllCompetitions();
export const sampleSubmissions: BattleSubmission[] = battleService.getAllSubmissions();
export const sampleDiscoveryBeats: DiscoveryBeat[] = beatService.getAllDiscoveryBeats();
export const sampleReleases: Release[] = releaseService.getAllReleases();
