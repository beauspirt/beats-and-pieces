"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { sampleCompetitions } from "@/lib/mock-data";
import { ArrowRight, Trophy } from "lucide-react";
import { Competition, BattlePhase } from "@/lib/types";

export default function BattlesPage() {
  const [competitions] = useState<Competition[]>(sampleCompetitions);

  const ongoingBattle = competitions.find((c) => c.phase !== "completed") || competitions[0];
  const pastBattles = competitions.filter((c) => c.phase === "completed");

  const getPhasePill = (phase: BattlePhase) => {
    switch (phase) {
      case "submission":
        return { label: "Submissions Open", bg: "bg-[#7B61FF] text-white" };
      case "rating":
        return { label: "Public Rating Active", bg: "bg-[#FF5E3A] text-white" };
      case "judging":
        return { label: "Jury Session In Progress", bg: "bg-[#7B61FF]/30 text-[#7B61FF]" };
      case "completed":
        return { label: "Completed", bg: "bg-[#222222] text-[#888888]" };
    }
  };

  return (
    <div className="space-y-12 w-full animate-in fade-in duration-300">
      
      {/* SECTION 1: ONGOING BATTLE */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5E3A] animate-pulse" />
            <span>Active Competition</span>
          </h2>
          <span className="text-sm font-mono text-[#888888]">
            {ongoingBattle.phase === "rating" ? "Public preselection active" : "Submissions close soon"}
          </span>
        </div>

        <div className="bg-[#181818] rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row gap-8 items-start hover:bg-[#1A1A1A] transition-all shadow-xl">
          
          {/* Cover Art Thumbnail (explicit width/height constraints) */}
          <div
            className="w-full md:w-64 h-64 max-w-[256px] max-h-[256px] rounded-2xl overflow-hidden relative shrink-0 bg-[#121212] shadow-2xl"
            style={{ width: "256px", height: "256px", position: "relative" }}
          >
            <Image
              src={ongoingBattle.coverImage}
              alt={ongoingBattle.title}
              width={256}
              height={256}
              className="w-full h-full object-cover"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              priority
            />
            <div
              className="absolute top-3 left-3 bg-[#121212]/85 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-black text-[#FF5E3A]"
              style={{ position: "absolute", top: "12px", left: "12px" }}
            >
              #{ongoingBattle.number}
            </div>
          </div>

          {/* Info & Single-Column Prizes */}
          <div className="flex-1 flex flex-col justify-between h-full space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-3">
                <span className={`px-3.5 py-1.5 rounded-full text-xs font-semibold ${getPhasePill(ongoingBattle.phase).bg}`}>
                  {getPhasePill(ongoingBattle.phase).label}
                </span>
                <span className="px-3.5 py-1.5 rounded-full bg-[#121212] text-xs text-[#A0A0A0] font-mono">
                  {ongoingBattle.totalSubmissions} Beats Entered
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                {ongoingBattle.title}
              </h1>

              <div className="space-y-1 text-sm text-[#A0A0A0] mt-3">
                <p>Hosted by: <span className="text-white font-medium">{ongoingBattle.hosts.join(", ")}</span></p>
                <p>Judged by: <span className="text-white font-medium">{ongoingBattle.judges.join(", ")}</span></p>
              </div>

              <p className="text-sm sm:text-base text-[#D1D1D1] mt-3 leading-relaxed">
                {ongoingBattle.description}
              </p>

              {/* SINGLE COLUMN PRIZES SECTION */}
              <div className="pt-5 mt-5 border-t border-[#262626] space-y-3">
                <span className="text-xs font-mono text-[#888888] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-[#E5A93C]" />
                  <span>Competition Prizes</span>
                </span>

                <div className="flex flex-col gap-2 max-w-xl">
                  {/* 1st Prize */}
                  <div className="flex items-center gap-3.5 px-4 py-2.5 rounded-xl bg-[#251E14] text-[#E5A93C] text-sm font-medium">
                    <span className="font-bold font-mono px-2 py-0.5 rounded bg-[#382B1B] text-[#E5A93C] text-xs">
                      1st
                    </span>
                    <span>{ongoingBattle.prizes.first}</span>
                  </div>

                  {/* 2nd Prize */}
                  <div className="flex items-center gap-3.5 px-4 py-2.5 rounded-xl bg-[#1E232A] text-[#94A3B8] text-sm font-medium">
                    <span className="font-bold font-mono px-2 py-0.5 rounded bg-[#2A3441] text-[#94A3B8] text-xs">
                      2nd
                    </span>
                    <span>{ongoingBattle.prizes.second}</span>
                  </div>

                  {/* 3rd Prize */}
                  <div className="flex items-center gap-3.5 px-4 py-2.5 rounded-xl bg-[#261814] text-[#D97706] text-sm font-medium">
                    <span className="font-bold font-mono px-2 py-0.5 rounded bg-[#3D251D] text-[#D97706] text-xs">
                      3rd
                    </span>
                    <span>{ongoingBattle.prizes.third}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#262626] mt-4">
              <div className="text-xs font-mono text-[#888888]">
                Deadlines: Submissions close Aug 10 • Public rating open until Aug 22
              </div>

              <Link
                href={`/battles/${ongoingBattle.id}`}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#FF5E3A] hover:bg-[#E04D2B] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#FF5E3A]/20 transition-all hover:scale-[1.02] active:scale-95"
              >
                <span>Enter Battle Arena</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: PAST BATTLES ARCHIVE */}
      <section className="space-y-6 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Past Battles & Hall of Fame</h2>
          <span className="text-sm font-mono text-[#888888]">
            {pastBattles.length} Archived Competitions
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pastBattles.map((battle) => (
            <Link
              key={battle.id}
              href={`/battles/${battle.id}`}
              className="bg-[#181818] rounded-2xl overflow-hidden hover:bg-[#1C1C1C] transition-all flex flex-col group border border-transparent hover:border-[#333333]"
            >
              {/* Card Cover Art */}
              <div
                className="h-44 w-full relative overflow-hidden bg-[#121212]"
                style={{ width: "100%", height: "176px", position: "relative" }}
              >
                <Image
                  src={battle.coverImage}
                  alt={battle.title}
                  width={400}
                  height={176}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div
                  className="absolute top-3 left-3 bg-[#121212]/85 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-xs font-mono font-bold text-[#888888]"
                  style={{ position: "absolute", top: "12px", left: "12px" }}
                >
                  #{battle.number}
                </div>
                <div
                  className="absolute top-3 right-3 bg-[#121212]/85 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-xs font-mono text-[#888888]"
                  style={{ position: "absolute", top: "12px", right: "12px" }}
                >
                  {battle.totalSubmissions} Entries
                </div>
              </div>

              {/* Card Details */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="text-xs font-mono text-[#7B61FF] font-semibold">
                    Completed Battle
                  </span>
                  <h3 className="font-bold text-lg text-white group-hover:text-[#7B61FF] transition-colors leading-snug">
                    {battle.title}
                  </h3>
                  <p className="text-xs text-[#888888] line-clamp-2 leading-relaxed">
                    {battle.description}
                  </p>
                </div>

                {/* 1st Place Podium Summary */}
                <div className="pt-3 border-t border-[#262626] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[#E5A93C] font-semibold">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Winner: Ortega</span>
                  </div>
                  <span className="text-[#888888] font-mono group-hover:text-white transition-colors flex items-center gap-1">
                    View Results <ArrowRight className="w-3 h-3" />
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
