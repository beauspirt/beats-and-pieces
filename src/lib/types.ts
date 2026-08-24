export type BattlePhase = "submission" | "rating" | "judging" | "completed";

export type UserRole = "user" | "producer" | "judge" | "host" | "admin";

export interface UserProfile {
  id: string;
  nickname: string;
  email: string;
  hideEmail?: boolean;
  avatarUrl: string;
  bio?: string;
  location?: string;
  role: UserRole;
  discordId?: string;
  discordUsername?: string;
  discordRoles?: string[];
  links?: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
    spotify?: string;
    bandcamp?: string;
    soundcloud?: string;
    beatstars?: string;
    website?: string;
  };
  stats?: {
    battlesEntered: number;
    battlesWon: number;
    totalFlames: number;
  };
  isClaimed?: boolean;
  claimedAt?: string;
  createdAt: string;
}

export interface BattleSample {
  id: string;
  title: string;
  audioUrl: string;
  duration: number;
  waveform?: number[];
}

export interface JudgeFeedbackItem {
  judgeId?: string;
  judgeName: string;
  score?: number;
  feedback?: string;
}

export interface BattleSubmission {
  id: string;
  battleId: string;
  userId: string;
  beatmakerTag: string;
  beatTitle: string;
  audioUrl: string;
  waveform?: number[];
  duration: number;
  bpm?: number;
  flameRating?: number;
  totalVotes?: number;
  juryScore?: number;
  juryFeedback?: string;
  judgeName?: string;
  juryFeedbacks?: JudgeFeedbackItem[];
  rank?: number;
  submittedAt: string;
}

export interface Competition {
  id: string;
  number: number;
  title: string;
  slug: string;
  coverImage: string;
  hosts: string[];
  hostDetails?: { name: string; email: string }[];
  judges: string[];
  judgeDetails?: { name: string; email: string }[];
  description: string;
  prizes: {
    first: string;
    second: string;
    third: string;
  };
  samples: BattleSample[];
  phase: BattlePhase;
  submissionStartsAt: string;
  submissionEndsAt: string;
  ratingEndsAt: string;
  judgingEndsAt?: string;
  totalSubmissions: number;
  minVotesRequired?: number;
  topFinalistsCutoff?: number;
  youtubeVodUrl?: string;
  rules?: string[];
  winner?: string;
  endedAt?: string;
}

export interface DiscoveryBeat {
  id: string;
  title: string;
  beatmaker: {
    id: string;
    tag: string;
    avatarUrl: string;
  };
  audioUrl: string;
  duration: number;
  waveform?: number[];
  bpm?: number;
  priceTag: string; // e.g. "Not For Sale", "$100 - $200", "$200+"
  genres?: string[];
  tags: string[];
  flames?: number;
  isFavorite?: boolean;
  battleSource?: string;
  tier?: number;
  rank?: number;
  juryScore?: number;
  juryFeedback?: string;
  judgeName?: string;
  juryFeedbacks?: JudgeFeedbackItem[];
  createdAt?: string;
}

export interface Release {
  id: string;
  title: string;
  slug?: string;
  coverImage: string;
  releaseDate?: string;
  description: string;
  spotifyUrl?: string;
  youtubeUrl?: string;
  appleMusicUrl?: string;
  bandcampUrl?: string;
  soundcloudUrl?: string;
  streamingLinks?: {
    spotify?: string;
    appleMusic?: string;
    bandcamp?: string;
    youtubeMusic?: string;
  };
  tracklist?: {
    trackNumber: number;
    title: string;
    producer: string;
    duration: string;
    audioUrl?: string;
  }[];
}

export interface ModerationFlag {
  id: string;
  battleId: string;
  voterUserId: string;
  voterNickname: string;
  voterEmail: string;
  flagType: "rapid_clicking" | "extreme_outlier" | "multi_account_ip" | "incomplete_votes";
  details: string;
  timestamp: string;
  status: "pending" | "approved" | "discarded";
  votesCast: number;
  averageRatingGiven: number;
}

export const STANDARD_BEAT_TAGS = [
  "Boom Bap",
  "Trap",
  "Lo-Fi",
  "R&B / Soul",
  "Drill",
  "Jazz Hop",
  "Afrobeats",
  "Dancehall / Reggae",
  "Electronic / Synthwave",
  "House / Garage",
  "Phonk",
  "G-Funk",
  "Grime",
  "Pop",
  "Rock / Alternative",
  "Experimental",
  "Chill",
  "Dark",
  "Aggressive / Hard",
  "Melancholic / Sad",
  "Uplifting / Happy",
  "Soulful",
  "Nostalgic / Vintage",
  "Energetic / Hype",
  "Atmospheric / Ambient",
  "Smooth",
  "Bouncy",
  "Psychedelic",
  "Cinematic",
  "Late Night",
  "Hypnotic",
  "Vinyl / Sampled",
  "Piano",
  "Guitar",
  "Heavy 808",
  "Analog Synth",
  "Brass / Horns",
  "Strings",
  "Vocal Chops",
  "Live Drums",
  "Tape Saturation",
  "Acoustic",
] as const;

export type StandardBeatTag = (typeof STANDARD_BEAT_TAGS)[number];

export interface VaultItem {
  id: string;
  title: string;
  category: "breakdowns" | "live-sets";
  producerId?: string;
  producerTag?: string;
  venue?: string;
  youtubeUrl: string;
  youtubeId: string;
  description?: string;
}

