"use client";

import React from "react";

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300 py-6">
      
      <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
        What the heck is this website all about??
      </h1>

      <div className="text-lg sm:text-xl font-bold text-[#FF5E3A] leading-snug">
        It all started when a global pandemic brought Romanian music producers together to chop samples and compete online.
      </div>

      <div className="space-y-6 text-sm text-zinc-300 leading-relaxed font-normal">
        <p>
          <strong>Beats & Pieces</strong> was born out of a shared passion for gritty boom bap, dust on vinyl records, sample chopping technique, and the Romanian underground hip-hop culture. What began as informal challenges on Discord evolved into organized beat battles that brought together hundreds of beatmakers and respected scene veterans as judges.
        </p>

        <p>
          Our mission has always been simple: create a fair, blind, community-driven arena where skill, groove, and originality speak louder than clout or follower count. Every battle gives contestants the exact same raw sample materials, anonymizes all submissions during preselection, and rewards the most innovative chops.
        </p>

        <p>
          Today, the platform serves as both a competition arena and a living archive of Romanian beat culture—featuring past battle finalists, official compilation releases, and an open discovery catalogue where artists can explore and license beats directly from our community producers.
        </p>

        <p>
          Whether you produce on an MPC, SP404, FL Studio, Ableton, or a tape machine—welcome home.
        </p>
      </div>

    </div>
  );
}
