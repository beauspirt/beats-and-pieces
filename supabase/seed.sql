-- ==============================================================================
-- Beats & Pieces — Seed Initial Producers, Battles, Submissions & Releases
-- ==============================================================================

-- 1. SEED PRODUCERS
INSERT INTO public.producers (id, nickname, email, avatar_url, bio, location, role, discord_username, discord_roles, links, stats)
VALUES 
  ('11111111-1111-1111-1111-111111111101', 'Ortega', 'ortega@soundlab.ro', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=240&auto=format&fit=crop&q=80', 'Dusty boom bap producer & vinyl excavator from Bucharest. 1st Place Winner of Beat Battle #1 & #5.', 'Bucharest, RO', 'user', 'Ortega#1234', ARRAY['Battle Winner', 'OG Producer'], '{"instagram": "https://instagram.com", "spotify": "https://spotify.com"}'::jsonb, '{"battlesEntered": 8, "battlesWon": 2, "totalFlames": 412}'::jsonb),
  ('11111111-1111-1111-1111-111111111102', 'Nerub', 'contact@nerub.ro', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80', 'Music Producer & Sound Designer from Bucharest. Host & founder of Beats & Pieces battles.', 'Bucharest, RO', 'admin', 'Nerub#0001', ARRAY['Host / Admin', 'Judge', 'OG Producer'], '{"instagram": "https://instagram.com/nerubsta", "website": "https://nerub.ro"}'::jsonb, '{"battlesEntered": 12, "battlesWon": 4, "totalFlames": 482}'::jsonb),
  ('11111111-1111-1111-1111-111111111103', 'C.S.T', 'cst.beats@gmail.com', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=240&auto=format&fit=crop&q=80', 'Lo-Fi and Boom Bap beatmaker crafting soulful chops and heavy 90s drums.', 'Cluj-Napoca, RO', 'user', 'CST#4567', ARRAY['OG Producer', '2nd Place Finalist'], '{"instagram": "https://instagram.com", "soundcloud": "https://soundcloud.com"}'::jsonb, '{"battlesEntered": 6, "battlesWon": 1, "totalFlames": 295}'::jsonb),
  ('11111111-1111-1111-1111-111111111104', 'flg', 'flg@producer.ro', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80', 'Sample flipper exploring raw analog textures and psychedelic boom bap grooves.', 'Timisoara, RO', 'user', 'flg#8901', ARRAY['Podium Finalist'], '{"instagram": "https://instagram.com"}'::jsonb, '{"battlesEntered": 5, "battlesWon": 1, "totalFlames": 260}'::jsonb)
ON CONFLICT (nickname) DO NOTHING;

-- 2. SEED BATTLES
INSERT INTO public.battles (id, number, title, description, cover_image, phase, hosts, judges, sample_pack_url, prizes, deadlines, total_submissions)
VALUES 
  ('battle-5', 5, 'Beat Battle #5 — Summer Heat', 'Flip the provided 70s Romanian vinyl samples. Create a boombap or lo-fi headnodder under 3:30. 134 producers entered the preliminary round.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80', 'rating', ARRAY['Nerub'], ARRAY['Nerub', 'Ortega', 'Special Guest Judge'], '/sample-packs/battle-5-samples.zip', '{"first": "Roland SP-404MKII + Official Vinyl Release", "second": "Arturia KeyLab 49 + Beats & Pieces Merch Pack", "third": "Audio-Technica ATH-M50x Headphones"}'::jsonb, '{"submission": "2026-08-10T23:59:59Z", "rating": "2026-08-22T23:59:59Z", "finalLive": "2026-08-25T19:00:00Z"}'::jsonb, 134),
  ('battle-4', 4, 'Beat Battle #4 — Romanian Folklore', 'Chop and flip traditional Romanian folk recordings from the 1960s. 89 producers competed.', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80', 'completed', ARRAY['Nerub'], ARRAY['Nerub', 'C.S.T'], '/sample-packs/battle-4-samples.zip', '{"first": "Akai MPC One", "second": "Korg Monologue Synthesizer", "third": "Beats & Pieces Sample Bundle"}'::jsonb, '{"submission": "2026-06-01T23:59:59Z", "rating": "2026-06-10T23:59:59Z", "finalLive": "2026-06-15T19:00:00Z"}'::jsonb, 89)
ON CONFLICT (id) DO NOTHING;

-- 3. SEED SUBMISSIONS FOR BATTLE #5
INSERT INTO public.submissions (id, battle_id, producer_id, anonymous_number, title, audio_url, duration, bpm, status, final_score, rank)
VALUES 
  ('sub-5-01', 'battle-5', '11111111-1111-1111-1111-111111111101', 1, 'Bonita Applebong', '/audio/01 Ortega - Bonita Applebong.wav', 67, 92, 'approved', 4.82, 1),
  ('sub-5-02', 'battle-5', '11111111-1111-1111-1111-111111111103', 2, 'ThunderClouds', '/audio/02 C.S.T - ThunderClouds.wav', 119, 88, 'approved', 4.65, 2),
  ('sub-5-03', 'battle-5', '11111111-1111-1111-1111-111111111104', 3, 'bule temporale', '/audio/03 flg - bule temporale.wav', 201, 90, 'approved', 4.50, 3)
ON CONFLICT (id) DO NOTHING;

-- 4. SEED BEATS DISCOVERY
INSERT INTO public.beats (id, producer_id, title, genre, bpm, musical_key, tags, duration, audio_url, flames_count, plays_count)
VALUES 
  ('beat-01', '11111111-1111-1111-1111-111111111101', 'Bonita Applebong', 'Boom Bap', 92, 'F Minor', ARRAY['Vinyl', 'Soul', '90s', 'Dusty'], 67, '/audio/01 Ortega - Bonita Applebong.wav', 142, 1280),
  ('beat-02', '11111111-1111-1111-1111-111111111103', 'ThunderClouds', 'Lo-Fi', 88, 'C Minor', ARRAY['Chill', 'Chop', 'Rain', 'Warm'], 119, '/audio/02 C.S.T - ThunderClouds.wav', 98, 890),
  ('beat-03', '11111111-1111-1111-1111-111111111104', 'bule temporale', 'Experimental', 90, 'A Minor', ARRAY['Analog', 'Psychedelic', 'Groove'], 201, '/audio/03 flg - bule temporale.wav', 115, 940)
ON CONFLICT (id) DO NOTHING;

-- 5. SEED RELEASES
INSERT INTO public.releases (id, title, type, cover_url, release_date, description, links)
VALUES 
  ('rel-01', 'Beats & Pieces Vol. 1 — The Vinyl Chops', 'compilation', 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&auto=format&fit=crop&q=80', '2026-05-20', 'The definitive compilation showcasing the top 15 producers from Beat Battles #1 through #4.', '{"bandcamp": "https://bandcamp.com", "spotify": "https://spotify.com"}'::jsonb),
  ('rel-02', 'Beats & Pieces Vol. 2 — Folklore Rewired', 'compilation', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80', '2026-07-15', 'Traditional folklore re-imagined through samplers, tape loops, and dusty boom bap drums.', '{"bandcamp": "https://bandcamp.com", "spotify": "https://spotify.com"}'::jsonb)
ON CONFLICT (id) DO NOTHING;
