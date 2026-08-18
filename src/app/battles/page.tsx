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
          
          {/* Cover Art Thumbnail (w-64 h-64 consistent with detail page) */}
          <div className="w-full md:w-64 h-64 rounded-2xl overflow-hidden relative shrink-0 bg-[#121212] shadow-2xl">
            <Image
              src={ongoingBattle.coverImage}
              alt={ongoingBattle.title}
              fill
              className="object-cover"
            />
            <div className="absolute top-3 left-3 bg-[#121212]/85 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-black text-[#FF5E3A]">
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
                    <span className="font-bold font-mono px-2 py-0.5 rounded bg-[#2A313C] text-[#94A3B8] text-xs">
                      2nd
                    </span>
                    <span>{ongoingBattle.prizes.second}</span>
                  </div>

                  {/* 3rd Prize */}
                  <div className="flex items-center gap-3.5 px-4 py-2.5 rounded-xl bg-[#261814] text-[#D97706] text-sm font-medium">
                    <span className="font-bold font-mono px-2 py-0.5 rounded bg-[#3B251F] text-[#D97706] text-xs">
                      3rd
                    </span>
                    <span>{ongoingBattle.prizes.third}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Enter Action */}
            <div className="pt-2">
              <Link
                href={`/battles/${ongoingBattle.id}`}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white text-sm font-bold transition-all shadow-md active:scale-95"
              >
                <span>Enter Competition</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 2: PAST BATTLES & ARCHIVE */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Past Competitions & Results
          </h2>
          <span className="text-sm font-mono text-[#888888]">
            {pastBattles.length} Editions Archived
          </span>
        </div>

        <div className="space-y-3.5">
          {pastBattles.map((battle) => (
            <Link
              key={battle.id}
              href={`/battles/${battle.id}`}
              className="bg-[#181818] rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-[#1C1C1C] transition-all group block"
            >
              {/* Left: Thumbnail & Details */}
              <div className="flex items-center gap-5 min-w-[280px]">
                <div className="w-16 h-16 rounded-xl bg-[#121212] relative overflow-hidden shrink-0">
                  <Image
                    src={battle.coverImage}
                    alt={battle.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute bottom-1 right-1 bg-[#121212]/90 px-1.5 py-0.5 rounded text-xs font-bold text-[#FF5E3A]">
                    #{battle.number}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-[#7B61FF] transition-colors leading-snug">
                    {battle.title}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-[#888888] mt-1">
                    <span>{battle.totalSubmissions} Beats</span>
                    <span>•</span>
                    <span>Judged by {battle.judges.join(", ")}</span>
                  </div>
                </div>
              </div>

              {/* Center/Right: Clean Winners Pills */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                {/* 1st Place Pill */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#251E14] text-[#E5A93C] text-sm">
                  <span className="font-bold font-mono">1st</span>
                  <span className="font-medium">Stolly</span>
                </div>

                {/* 2nd Place Pill */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1E232A] text-[#94A3B8] text-sm">
                  <span className="font-bold font-mono">2nd</span>
                  <span className="font-medium">mateicojo</span>
                </div>

                {/* 3rd Place Pill */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#261814] text-[#D97706] text-sm">
                  <span className="font-bold font-mono">3rd</span>
                  <span className="font-medium">BENJAHMIN</span>
                </div>

                <div className="hidden lg:flex items-center text-[#666666] group-hover:text-white pl-2 transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
