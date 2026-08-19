"use client";

import React from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";

import { sampleReleases } from "@/lib/mock-data";

export default function ReleasesPage() {
  return (
    <div className="w-full space-y-12 py-2 animate-in fade-in duration-300">
      
      {sampleReleases.map((release) => (
        <div
          key={release.id}
          className="flex flex-col md:flex-row items-start gap-8 sm:gap-10 w-full"
        >
          {/* Square Cover Artwork */}
          <div
            className="w-48 h-48 sm:w-56 sm:h-56 md:w-60 md:h-60 rounded-2xl overflow-hidden relative shrink-0 bg-[#181818] shadow-2xl"
          >
            <Image
              src={release.coverImage}
              alt={release.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 240px"
              priority
            />
          </div>

          {/* Release Metadata */}
          <div className="flex-1 w-full flex flex-col justify-between space-y-4 pt-1">
            <div className="space-y-3 w-full">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {release.title}
              </h2>

              <p className="text-sm text-[#D1D1D1] leading-relaxed w-full">
                {release.description}
              </p>
            </div>

            {/* External Streaming Links */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {release.spotifyUrl && (
                <a
                  href={release.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-[#181818] hover:bg-[#222222] text-white text-xs sm:text-sm font-bold transition-all flex items-center gap-2"
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
                  className="px-5 py-2.5 rounded-xl bg-[#181818] hover:bg-[#222222] text-white text-xs sm:text-sm font-bold transition-all flex items-center gap-2"
                >
                  <span>YouTube Music</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#888888]" />
                </a>
              )}
            </div>
          </div>

        </div>
      ))}

    </div>
  );
}
