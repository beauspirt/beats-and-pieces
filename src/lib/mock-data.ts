import { UserProfile, Competition, BattleSubmission, DiscoveryBeat, Release, ModerationFlag } from "@/lib/types";
import {
  producerService,
  battleService,
  releaseService,
  beatService,
  moderationService,
} from "@/services";

export const sampleProducers: Record<string, UserProfile> = producerService.getProducersMap();
export const currentUser: UserProfile = sampleProducers["usr-nerub"] || Object.values(sampleProducers)[0];
export const sampleCompetitions: Competition[] = battleService.getAllCompetitions();
export const sampleSubmissions: BattleSubmission[] = battleService.getAllSubmissions();
export const sampleDiscoveryBeats: DiscoveryBeat[] = beatService.getAllDiscoveryBeats();
export const sampleReleases: Release[] = releaseService.getAllReleases();
export const sampleModerationFlags: ModerationFlag[] = moderationService.getAllFlags();
