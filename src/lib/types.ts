export type BattlePhase = "submission" | "rating" | "judging" | "completed";

export type UserRole = "user" | "producer" | "judge" | "admin";

export interface UserProfile {
  id: string;
  nickname: string;
  email: string;
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
  judgeName: string;
  feedback: string;
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
  judges: string[];
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
  judgingEndsAt: string;
  totalSubmissions: number;
  minVotesRequired?: number;
  topFinalistsCutoff?: number;
  youtubeVodUrl?: string;
  winner?: string;
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
  bpm: number;
  priceTag: string; // e.g. "Not For Sale", "$100 - $200", "$200+"
  genres?: string[];
  tags: string[];
  flames?: number;
  isFavorite?: boolean;
  battleSource?: string;
  tier?: number;
  rank?: number;
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
