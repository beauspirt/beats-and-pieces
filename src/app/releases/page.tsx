"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { releaseService } from "@/services/releaseService";
import { Release } from "@/lib/types";

function formatReleaseDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    if (year && month && day) {
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export default function ReleasesPage() {
  const [releases, setReleases] = useState<Release[]>(() => releaseService.getAllReleases());

  useEffect(() => {
    setReleases(releaseService.getAllReleases());
  }, []);

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      {releases.map((release) => (
        <div
          key={release.id}
          className="flex flex-col md:flex-row items-start gap-8 sm:gap-10 w-full"
        >
          {/* Square Cover Artwork (Full width on mobile, 380px on desktop) */}
          <div className="w-full aspect-square md:w-88 md:h-88 lg:w-[380px] lg:h-[380px] rounded-2xl overflow-hidden relative shrink-0 bg-[#181818] shadow-2xl mx-auto md:mx-0">
            <Image
              src={release.coverImage}
              alt={release.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 380px"
              priority
            />
          </div>

          {/* Release Metadata */}
          <div className="flex-1 w-full flex flex-col justify-between space-y-4 pt-1">
            <div className="space-y-2.5 w-full">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {release.title}
              </h2>

              {release.releaseDate && (
                <p className="text-xs text-[#888888]">
                  released {formatReleaseDate(release.releaseDate)}
                </p>
              )}

              <p className="text-sm text-[#D1D1D1] leading-relaxed w-full whitespace-pre-line pt-1">
                {release.description}
              </p>
            </div>

            {/* External Streaming Links */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              {release.spotifyUrl && (
                <a
                  href={release.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-2xl bg-[#181818] hover:bg-[#222222] text-white text-xs font-bold transition-all flex items-center gap-2"
                >
                  <span>Spotify</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#888888]" />
                </a>
              )}

              {release.appleMusicUrl && (
                <a
                  href={release.appleMusicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-2xl bg-[#181818] hover:bg-[#222222] text-white text-xs font-bold transition-all flex items-center gap-2"
                >
                  <span>Apple Music</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#888888]" />
                </a>
              )}

              {release.youtubeUrl && (
                <a
                  href={release.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-2xl bg-[#181818] hover:bg-[#222222] text-white text-xs font-bold transition-all flex items-center gap-2"
                >
                  <span>YouTube</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#888888]" />
                </a>
              )}

              {release.bandcampUrl && (
                <a
                  href={release.bandcampUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-2xl bg-[#181818] hover:bg-[#222222] text-white text-xs font-bold transition-all flex items-center gap-2"
                >
                  <span>Bandcamp</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#888888]" />
                </a>
              )}

              {release.soundcloudUrl && (
                <a
                  href={release.soundcloudUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-2xl bg-[#181818] hover:bg-[#222222] text-white text-xs font-bold transition-all flex items-center gap-2"
                >
                  <span>SoundCloud</span>
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
