"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { sampleCompetitions } from "@/lib/mock-data";
import { ArrowRight, Trophy } from "lucide-react";
import { Competition } from "@/lib/types";

export default function BattlesPage() {
  const [competitions] = useState<Competition[]>(sampleCompetitions);

  const ongoingBattle = competitions.find((c) => c.phase !== "completed") || competitions[0];
  const pastBattles = competitions.filter((c) => c.phase === "completed");

  return (
    <div className="space-y-10 w-full animate-in fade-in duration-300">
      
      {/* SECTION 1: ONGOING BATTLE (ENTIRE CARD CLICKABLE) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between h-9">
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5E3A] animate-pulse" />
            <span>Active Competition</span>
          </h2>
        </div>

        <Link
          href={`/battles/${ongoingBattle.id}`}
          className="bg-[#181818] rounded-3xl p-5 sm:p-7 flex flex-col md:flex-row gap-7 items-start hover:bg-[#1A1A1A] transition-all shadow-xl block cursor-pointer group relative overflow-hidden"
        >
          {/* Cover Art Thumbnail (Grand 320px Square) */}
          <div
            className="w-full md:w-80 h-80 max-w-[320px] max-h-[320px] rounded-2xl overflow-hidden relative shrink-0 bg-[#121212] shadow-2xl"
            style={{ width: "320px", height: "320px", position: "relative" }}
          >
            <Image
              src={ongoingBattle.coverImage}
              alt={ongoingBattle.title}
              width={320}
              height={320}
              className="w-full h-full object-cover"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              priority
            />
          </div>

          {/* Info */}
          <div className="flex-1 w-full min-w-0 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
                {ongoingBattle.title}
              </h1>
              <div className="flex items-center gap-2 shrink-0 self-start sm:self-center flex-wrap">
                <span className="px-3.5 py-1.5 rounded-full bg-[#7B61FF] text-xs sm:text-sm font-semibold text-white shadow-sm">
                  {ongoingBattle.phase === "submission"
                    ? "Stage 1: Submissions Open"
                    : ongoingBattle.phase === "rating"
                    ? "Stage 2: Public Rating"
                    : ongoingBattle.phase === "judging"
                    ? "Stage 3: Jury Evaluation"
                    : "Stage 4: Results"}
                </span>
                <span className="px-3.5 py-1.5 rounded-full bg-[#121212] text-xs sm:text-sm text-[#A0A0A0]">
                  {ongoingBattle.totalSubmissions} Total Entries
                </span>
              </div>
            </div>

            <div className="space-y-1 text-sm sm:text-base text-[#A0A0A0]">
              <p>Hosted by: <span className="text-white font-medium">{ongoingBattle.hosts.join(", ")}</span></p>
              <p>Judged by: <span className="text-white font-medium">{ongoingBattle.judges.join(", ")}</span></p>
            </div>

            <p className="text-sm sm:text-base text-[#D1D1D1] leading-relaxed">
              {ongoingBattle.description}
            </p>

            <div className="text-xs sm:text-sm text-[#888888] pt-2">
              Submissions close Aug 10 • Public rating open until Aug 22
            </div>
          </div>
        </Link>
      </section>

      {/* SECTION 2: PAST COMPETITIONS ARCHIVE (COMPACT SQUARE COVER ARTS, 4-COLUMN GRID) */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Past Competitions</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {pastBattles.map((battle) => (
            <Link
              key={battle.id}
              href={`/battles/${battle.id}`}
              className="bg-[#181818] rounded-2xl p-3.5 sm:p-4 hover:bg-[#1C1C1C] transition-all flex flex-col group shadow-lg space-y-3"
            >
              {/* Compact Square Card Cover Art */}
              <div className="w-full aspect-square relative rounded-xl overflow-hidden bg-[#121212] shrink-0">
                <Image
                  src={battle.coverImage}
                  alt={battle.title}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Card Details (Entries in text section, clean typography) */}
              <div className="flex-1 flex flex-col justify-between space-y-2.5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-[#888888]">
                    <span>Completed</span>
                    <span className="font-medium px-2 py-0.5 rounded-full bg-[#121212] text-[#A0A0A0] text-[11px]">
                      {battle.totalSubmissions} Entries
                    </span>
                  </div>

                  <h3 className="font-bold text-sm sm:text-base text-white leading-snug">
                    {battle.title}
                  </h3>

                  <p className="text-xs text-[#888888] line-clamp-2 leading-relaxed">
                    {battle.description}
                  </p>
                </div>

                {/* Winner Summary Footer */}
                <div className="pt-2 flex items-center justify-between text-xs border-t border-[#222222]/80">
                  <div className="flex items-center gap-1 text-[#E5A93C] font-semibold text-[11px] sm:text-xs">
                    <Trophy className="w-3 h-3" />
                    <span>Winner: Ortega</span>
                  </div>
                  <span className="text-[#888888] group-hover:text-white transition-colors flex items-center gap-1 text-[11px] sm:text-xs">
                    Results <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
