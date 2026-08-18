"use client";

import React from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";

interface ReleaseItem {
  id: string;
  title: string;
  coverImage: string;
  description: string;
  spotifyUrl?: string;
  youtubeUrl?: string;
}

const releasesData: ReleaseItem[] = [
  {
    id: "rel-1",
    title: "Flip Tape #1",
    coverImage: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80",
    description: "This is our first beat tape, a compilation of the best beats chosen from the first flip battle. The sample used in all the beats, chosen by Nerub, is 'Steven Halpern - Apollo's Lyre'.",
    spotifyUrl: "https://open.spotify.com",
    youtubeUrl: "https://youtube.com",
  },
  {
    id: "rel-2",
    title: "Flip Tape #2",
    coverImage: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80",
    description: "This is our second beat tape, a compilation of the best beats chosen from the second flip battle. The samples used in all the beats, chosen by Ortega, are: Eduard Artemyev - На Сельской Станции, Eugen Doga - Waltz.",
    spotifyUrl: "https://open.spotify.com",
    youtubeUrl: "https://youtube.com",
  },
  {
    id: "rel-3",
    title: "The Miles Davis Tape",
    coverImage: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
    description: "Our first thematic beat tape, a compilation of beats made with samples from the music of the legendary Miles Davis.",
    youtubeUrl: "https://youtube.com",
  },
  {
    id: "rel-4",
    title: "The Christmas Tape",
    coverImage: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
    description: "This is a Christmas themed beat tape, a compilation of beats made with samples taken from Elena Mîndru Quintet's amazing album called 'Romanian Christmas Stories' in which they created jazz reinterpretations of traditional Romanian carols.",
    youtubeUrl: "https://youtube.com",
  },
];

export default function ReleasesPage() {
  return (
    <div className="w-full space-y-12 py-4 animate-in fade-in duration-300">
      
      {releasesData.map((release) => (
        <div
          key={release.id}
          className="bg-[#181818] rounded-2xl p-6 sm:p-8 shadow-xl"
        >
          <div className="flex flex-col md:flex-row items-start gap-8">
            
            {/* Square Cover Artwork */}
            <div className="w-full md:w-64 h-64 rounded-2xl overflow-hidden relative shrink-0 bg-[#121212] shadow-2xl">
              <Image
                src={release.coverImage}
                alt={release.title}
                fill
                className="object-cover"
              />
            </div>

            {/* Release Metadata */}
            <div className="flex-1 flex flex-col justify-between space-y-4 pt-1">
              <div className="space-y-3">
                <span className="px-3 py-1 rounded-full bg-[#7B61FF] text-white text-xs font-semibold inline-block">
                  Official Beat Tape
                </span>

                <h2 className="text-3xl font-black text-white tracking-tight">
                  {release.title}
                </h2>

                <p className="text-sm sm:text-base text-[#D1D1D1] leading-relaxed max-w-3xl">
                  {release.description}
                </p>
              </div>

              {/* External Streaming Links */}
              <div className="flex flex-wrap items-center gap-3 pt-3">
                {release.spotifyUrl && (
                  <a
                    href={release.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-xl bg-[#121212] hover:bg-[#1E1E1E] text-white text-xs font-bold transition-all flex items-center gap-2"
                  >
                    <span>Listen on Spotify</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#888888]" />
                  </a>
                )}

                {release.youtubeUrl && (
                  <a
                    href={release.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-xl bg-[#121212] hover:bg-[#1E1E1E] text-white text-xs font-bold transition-all flex items-center gap-2"
                  >
                    <span>YouTube Music</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#888888]" />
                  </a>
                )}
              </div>
            </div>

          </div>
        </div>
      ))}

    </div>
  );
}
