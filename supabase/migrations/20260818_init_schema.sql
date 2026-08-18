-- ==============================================================================
-- Beats & Pieces — Production PostgreSQL Schema & Anti-Cheat RLS Policies
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PRODUCER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.producers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nickname TEXT NOT NULL UNIQUE,
  email TEXT,
  avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=240&auto=format&fit=crop&q=80',
  bio TEXT,
  location TEXT DEFAULT 'Bucharest, RO',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'judge', 'moderator')),
  discord_id TEXT,
  discord_username TEXT,
  discord_roles TEXT[] DEFAULT '{}',
  links JSONB DEFAULT '{"instagram": "", "spotify": "", "beatstars": "", "soundcloud": "", "bandcamp": "", "youtube": ""}'::jsonb,
  stats JSONB DEFAULT '{"battlesEntered": 0, "battlesWon": 0, "totalFlames": 0}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. BATTLES TABLE
CREATE TABLE IF NOT EXISTS public.battles (
  id TEXT PRIMARY KEY,
  number INT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  cover_image TEXT NOT NULL,
  phase TEXT NOT NULL DEFAULT 'submission' CHECK (phase IN ('submission', 'rating', 'judging', 'completed')),
  hosts TEXT[] DEFAULT '{}',
  judges TEXT[] DEFAULT '{}',
  sample_pack_url TEXT,
  sample_tracks JSONB DEFAULT '[]'::jsonb,
  rules JSONB DEFAULT '{"submissionLimit": 1, "maxDuration": "3:30", "mustUseSamplePack": true}'::jsonb,
  prizes JSONB DEFAULT '{"first": "", "second": "", "third": ""}'::jsonb,
  deadlines JSONB DEFAULT '{"submission": "", "rating": "", "finalLive": ""}'::jsonb,
  winner_id UUID REFERENCES public.producers(id) ON DELETE SET NULL,
  total_submissions INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.submissions (
  id TEXT PRIMARY KEY,
  battle_id TEXT NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  producer_id UUID NOT NULL REFERENCES public.producers(id) ON DELETE CASCADE,
  anonymous_number INT NOT NULL,
  title TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  master_wav_url TEXT,
  duration INT NOT NULL DEFAULT 45,
  bpm INT DEFAULT 90,
  waveform_peaks JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  final_score NUMERIC(4, 2) DEFAULT 0.00,
  rank INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(battle_id, producer_id)
);

-- Index for high-performance battle lookups
CREATE INDEX IF NOT EXISTS idx_submissions_battle ON public.submissions(battle_id);
CREATE INDEX IF NOT EXISTS idx_submissions_producer ON public.submissions(producer_id);

-- 5. RATINGS TABLE (Public Preselection 1-5 Flames)
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id TEXT NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  battle_id TEXT NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES public.producers(id) ON DELETE CASCADE,
  score INT NOT NULL CHECK (score >= 1 AND score <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(submission_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_submission ON public.ratings(submission_id);
CREATE INDEX IF NOT EXISTS idx_ratings_voter_battle ON public.ratings(battle_id, voter_id);

-- 6. JURY EVALUATIONS TABLE
CREATE TABLE IF NOT EXISTS public.jury_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id TEXT NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL REFERENCES public.producers(id) ON DELETE CASCADE,
  score NUMERIC(4, 2) NOT NULL CHECK (score >= 0.0 AND score <= 5.0),
  categories JSONB DEFAULT '{"originality": 0, "mix": 0, "groove": 0, "sampleFlip": 0}'::jsonb,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(submission_id, judge_id)
);

-- 7. BEATS CATALOG TABLE (Discovery)
CREATE TABLE IF NOT EXISTS public.beats (
  id TEXT PRIMARY KEY,
  producer_id UUID NOT NULL REFERENCES public.producers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  genre TEXT NOT NULL,
  bpm INT NOT NULL,
  musical_key TEXT,
  tags TEXT[] DEFAULT '{}',
  duration INT NOT NULL,
  audio_url TEXT NOT NULL,
  waveform_peaks JSONB DEFAULT '[]'::jsonb,
  flames_count INT DEFAULT 0,
  plays_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_beats_producer ON public.beats(producer_id);
CREATE INDEX IF NOT EXISTS idx_beats_genre ON public.beats(genre);

-- 8. RELEASES TABLE
CREATE TABLE IF NOT EXISTS public.releases (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('compilation', 'ep', 'album', 'single')),
  cover_url TEXT NOT NULL,
  release_date DATE NOT NULL,
  description TEXT,
  links JSONB DEFAULT '{"bandcamp": "", "spotify": "", "apple": "", "soundcloud": ""}'::jsonb,
  tracks JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 9. PERMISSIONS & ROLE GRANTS (Required for Supabase PostgREST API)
-- ==============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) & ANTI-CHEAT POLICIES
-- ==============================================================================

ALTER TABLE public.producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jury_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;

-- Producers: Publicly readable, editable by owner or admin
CREATE POLICY "Producers are viewable by everyone" ON public.producers
  FOR SELECT USING (true);

CREATE POLICY "Producers can update their own profile" ON public.producers
  FOR UPDATE USING (auth.uid() = id);

-- Battles: Publicly readable, editable only by admins
CREATE POLICY "Battles are viewable by everyone" ON public.battles
  FOR SELECT USING (true);

-- Submissions: Publicly readable for approved entries
CREATE POLICY "Public can view approved submissions" ON public.submissions
  FOR SELECT USING (status = 'approved' OR auth.uid() = producer_id);

CREATE POLICY "Producers can submit to active submission phase" ON public.submissions
  FOR INSERT WITH CHECK (
    auth.uid() = producer_id AND
    EXISTS (
      SELECT 1 FROM public.battles 
      WHERE id = battle_id AND phase = 'submission'
    )
  );

-- Ratings: Viewable by voter or admin
CREATE POLICY "Ratings viewable by voter or admin" ON public.ratings
  FOR SELECT USING (
    auth.uid() = voter_id OR
    EXISTS (SELECT 1 FROM public.producers WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Producers can rate submissions during rating phase" ON public.ratings
  FOR INSERT WITH CHECK (
    auth.uid() = voter_id AND
    NOT EXISTS (
      SELECT 1 FROM public.submissions 
      WHERE id = submission_id AND producer_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM public.battles 
      WHERE id = battle_id AND phase = 'rating'
    )
  );

CREATE POLICY "Producers can update their vote" ON public.ratings
  FOR UPDATE USING (auth.uid() = voter_id);

-- Beats & Releases: Publicly readable
CREATE POLICY "Beats are viewable by everyone" ON public.beats
  FOR SELECT USING (true);

CREATE POLICY "Releases are viewable by everyone" ON public.releases
  FOR SELECT USING (true);

-- ==============================================================================
-- 11. QUALIFIED BALLOT 50% VALIDATION FUNCTION
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.calculate_qualified_battle_scores(p_battle_id TEXT)
RETURNS TABLE (
  submission_id TEXT,
  average_score NUMERIC(4, 2),
  qualified_votes_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_submissions INT;
  v_min_required_votes INT;
BEGIN
  SELECT COUNT(*) INTO v_total_submissions
  FROM public.submissions
  WHERE battle_id = p_battle_id AND status = 'approved';

  v_min_required_votes := CEIL(v_total_submissions * 0.50);

  RETURN QUERY
  WITH qualified_voters AS (
    SELECT voter_id
    FROM public.ratings
    WHERE battle_id = p_battle_id
    GROUP BY voter_id
    HAVING COUNT(*) >= v_min_required_votes
  )
  SELECT 
    r.submission_id,
    ROUND(AVG(r.score)::numeric, 2) AS average_score,
    COUNT(r.id)::int AS qualified_votes_count
  FROM public.ratings r
  JOIN qualified_voters qv ON r.voter_id = qv.voter_id
  WHERE r.battle_id = p_battle_id
  GROUP BY r.submission_id;
END;
$$;
