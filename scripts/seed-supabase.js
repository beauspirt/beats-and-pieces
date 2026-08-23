const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Missing environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const dataDir = path.join(__dirname, "..", "src", "data");

async function seed() {
  console.log("🚀 Starting Supabase Database Seed...");

  // 1. Seed Producers
  try {
    const producersData = JSON.parse(fs.readFileSync(path.join(dataDir, "producers.json"), "utf8"));
    const producerRows = Object.values(producersData).map((p) => ({
      id: p.id,
      nickname: p.nickname,
      email: p.email,
      avatar_url: p.avatarUrl || "/avatars/default-avatar.png",
      bio: p.bio || "",
      location: p.location || "",
      role: p.role || "producer",
      discord_id: p.discordId || null,
      discord_username: p.discordUsername || null,
      discord_roles: p.discordRoles || [],
      links: p.links || {},
      stats: p.stats || { battlesEntered: 0, battlesWon: 0, totalFlames: 0 },
      is_claimed: p.isClaimed || false,
      claimed_at: p.claimedAt || null,
      created_at: p.createdAt || new Date().toISOString(),
    }));

    const { error: pErr } = await supabase.from("producers").upsert(producerRows);
    if (pErr) console.warn("⚠️ Producers seed error:", pErr.message);
    else console.log(`✅ Seeded ${producerRows.length} producers`);
  } catch (err) {
    console.error("Producers seed failure:", err.message);
  }

  // 2. Seed Battles
  try {
    const battlesData = JSON.parse(fs.readFileSync(path.join(dataDir, "competitions.json"), "utf8"));
    const battleRows = battlesData.map((b) => ({
      id: b.id,
      number: b.number,
      title: b.title,
      slug: b.slug || b.id,
      cover_image: b.coverImage || "/covers/beat-battle-8.png",
      hosts: b.hosts || [],
      host_details: b.hostDetails || [],
      judges: b.judges || [],
      judge_details: b.judgeDetails || [],
      description: b.description || "",
      prizes: b.prizes || { first: "", second: "", third: "" },
      samples: b.samples || [],
      phase: b.phase || "completed",
      submission_starts_at: b.submissionStartsAt || null,
      submission_ends_at: b.submissionEndsAt || null,
      rating_ends_at: b.ratingEndsAt || null,
      judging_ends_at: b.judgingEndsAt || null,
      ended_at: b.endedAt || null,
      total_submissions: b.totalSubmissions || 0,
      min_votes_required: b.minVotesRequired || 5,
      top_finalists_cutoff: b.topFinalistsCutoff || 10,
      youtube_vod_url: b.youtubeVodUrl || null,
      rules: b.rules || [],
      winner: b.winner || null,
    }));

    const { error: bErr } = await supabase.from("battles").upsert(battleRows);
    if (bErr) console.warn("⚠️ Battles seed error:", bErr.message);
    else console.log(`✅ Seeded ${battleRows.length} battles`);
  } catch (err) {
    console.error("Battles seed failure:", err.message);
  }

  // 3. Seed Submissions
  try {
    const subsData = JSON.parse(fs.readFileSync(path.join(dataDir, "submissions.json"), "utf8"));
    const subRows = subsData.map((s) => ({
      id: s.id,
      battle_id: s.battleId,
      user_id: s.userId,
      beatmaker_tag: s.beatmakerTag,
      beat_title: s.beatTitle,
      audio_url: s.audioUrl,
      waveform: s.waveform || [],
      duration: s.duration || 120,
      bpm: s.bpm || null,
      flame_rating: s.flameRating || 0,
      total_votes: s.totalVotes || 0,
      jury_score: s.juryScore || null,
      jury_feedback: s.juryFeedback || null,
      judge_name: s.judgeName || null,
      jury_feedbacks: s.juryFeedbacks || [],
      rank: s.rank || null,
      submitted_at: s.submittedAt || new Date().toISOString(),
    }));

    const { error: sErr } = await supabase.from("submissions").upsert(subRows);
    if (sErr) console.warn("⚠️ Submissions seed error:", sErr.message);
    else console.log(`✅ Seeded ${subRows.length} submissions`);
  } catch (err) {
    console.error("Submissions seed failure:", err.message);
  }

  // 4. Seed Beats (Showcase)
  try {
    const beatsData = JSON.parse(fs.readFileSync(path.join(dataDir, "discovery-beats.json"), "utf8"));
    const beatRows = beatsData.map((b) => ({
      id: b.id,
      title: b.title,
      producer_id: b.beatmaker.id,
      audio_url: b.audioUrl,
      duration: b.duration || 120,
      waveform: b.waveform || [],
      bpm: b.bpm || null,
      price_tag: b.priceTag || "Not For Sale",
      genres: b.genres || [],
      tags: b.tags || [],
      flames: b.flames || 0,
      battle_source: b.battleSource || null,
      tier: b.tier || 4,
      rank: b.rank || null,
      created_at: b.createdAt || new Date().toISOString(),
    }));

    const { error: btErr } = await supabase.from("beats").upsert(beatRows);
    if (btErr) console.warn("⚠️ Beats seed error:", btErr.message);
    else console.log(`✅ Seeded ${beatRows.length} showcase beats`);
  } catch (err) {
    console.error("Beats seed failure:", err.message);
  }

  // 5. Seed Releases
  try {
    const releasesData = JSON.parse(fs.readFileSync(path.join(dataDir, "releases.json"), "utf8"));
    const releaseRows = releasesData.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug || r.id,
      cover_image: r.coverImage,
      release_date: r.releaseDate || null,
      description: r.description || "",
      spotify_url: r.spotifyUrl || null,
      apple_music_url: r.appleMusicUrl || null,
      youtube_url: r.youtubeUrl || null,
      bandcamp_url: r.bandcampUrl || null,
      soundcloud_url: r.soundcloudUrl || null,
      streaming_links: r.streamingLinks || {},
      tracklist: r.tracklist || [],
    }));

    const { error: rErr } = await supabase.from("releases").upsert(releaseRows);
    if (rErr) console.warn("⚠️ Releases seed error:", rErr.message);
    else console.log(`✅ Seeded ${releaseRows.length} releases`);
  } catch (err) {
    console.error("Releases seed failure:", err.message);
  }

  console.log("🏁 Supabase Database Seeding Completed!");
}

seed().catch(console.error);
