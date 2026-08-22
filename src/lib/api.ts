import { supabase, isSupabaseConfigured } from "./supabase";
import { sampleCompetitions, sampleProducers, sampleDiscoveryBeats, sampleReleases } from "./mock-data";
import { Competition, DiscoveryBeat, Release, UserProfile, BattleSubmission } from "./types";

/**
 * Fetch all battles from Supabase with fallback to mock data
 */
export async function getBattles(): Promise<Competition[]> {
  if (!isSupabaseConfigured) return sampleCompetitions;

  try {
    const { data, error } = await supabase
      .from("battles")
      .select("*")
      .order("number", { ascending: false });

    if (error || !data || data.length === 0) {
      console.warn("Supabase getBattles fallback:", error?.message);
      return sampleCompetitions;
    }

    return data.map((b) => ({
      id: b.id,
      number: b.number,
      title: b.title,
      slug: b.id,
      description: b.description,
      coverImage: b.cover_image,
      phase: b.phase,
      hosts: b.hosts || [],
      judges: b.judges || [],
      prizes: b.prizes || { first: "", second: "", third: "" },
      samples: b.sample_tracks || [],
      submissionStartsAt: b.deadlines?.submission || "2026-08-01T00:00:00Z",
      submissionEndsAt: b.deadlines?.submission || "2026-08-10T23:59:59Z",
      ratingEndsAt: b.deadlines?.rating || "2026-08-22T23:59:59Z",
      judgingEndsAt: b.deadlines?.finalLive || "2026-08-25T19:00:00Z",
      totalSubmissions: b.total_submissions || 0,
    }));
  } catch (err) {
    console.error("getBattles error:", err);
    return sampleCompetitions;
  }
}

/**
 * Fetch a single battle by ID
 */
export async function getBattleById(id: string): Promise<Competition | null> {
  const battles = await getBattles();
  return battles.find((b) => b.id === id) || null;
}

/**
 * Fetch all producers
 */
export async function getProducers(): Promise<Record<string, UserProfile>> {
  if (!isSupabaseConfigured) return sampleProducers;

  try {
    const { data, error } = await supabase.from("producers").select("*");
    if (error || !data || data.length === 0) return sampleProducers;

    const result: Record<string, UserProfile> = {};
    for (const p of data) {
      result[p.nickname.toLowerCase().replace(/[^a-z0-9]/g, "")] = {
        id: p.id,
        nickname: p.nickname,
        email: p.email || "",
        avatarUrl: p.avatar_url,
        bio: p.bio || "",
        role: p.role,
        discordId: p.discord_id,
        discordUsername: p.discord_username,
        discordRoles: p.discord_roles || [],
        links: p.links || {},
        stats: p.stats || { battlesEntered: 0, battlesWon: 0, totalFlames: 0 },
        createdAt: p.created_at,
      };
    }
    return result;
  } catch {
    return sampleProducers;
  }
}

/**
 * Fetch releases
 */
export async function getReleases(): Promise<Release[]> {
  if (!isSupabaseConfigured) return sampleReleases;

  try {
    const { data, error } = await supabase
      .from("releases")
      .select("*")
      .order("release_date", { ascending: false });

    if (error || !data || data.length === 0) return sampleReleases;

    return data.map((r) => ({
      id: r.id,
      title: r.title,
      coverImage: r.cover_url,
      releaseDate: r.release_date,
      description: r.description || "",
      streamingLinks: r.links || {},
      tracklist: r.tracks || [],
    }));
  } catch {
    return sampleReleases;
  }
}

/**
 * Submit a community flame rating to Supabase
 */
export async function submitRating(submissionId: string, battleId: string, score: number, voterId?: string) {
  if (!isSupabaseConfigured) return { success: true };

  const finalVoterId = voterId || "11111111-1111-1111-1111-111111111101"; // Fallback guest/test voter

  try {
    const { data, error } = await supabase.from("ratings").upsert(
      {
        submission_id: submissionId,
        battle_id: battleId,
        voter_id: finalVoterId,
        score: score,
      },
      { onConflict: "submission_id,voter_id" }
    );

    if (error) {
      console.warn("submitRating error:", error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err };
  }
}
