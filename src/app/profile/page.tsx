"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { currentUser } from "@/lib/mock-data";
import { UserProfile } from "@/lib/types";
import { X, ShieldCheck, ExternalLink } from "lucide-react";

export default function UserProfilePage() {
  const [profile, setProfile] = useState<UserProfile>(currentUser);
  const [defaultLicensing, setDefaultLicensing] = useState<"for_sale" | "not_for_sale">("for_sale");
  const [defaultPrice, setDefaultPrice] = useState("$150");
  const [links, setLinks] = useState<Record<string, string>>({
    instagram: "https://www.instagram.com/nerubsta",
    facebook: "",
    youtube: "https://youtube.com/@nerub",
    spotify: "https://open.spotify.com/artist/nerub",
    bandcamp: "",
    soundcloud: "https://soundcloud.com/nerub",
    beatstars: "https://beatstars.com/nerub",
    website: "https://nerub.ro",
  });
  const [isLinkedDiscord, setIsLinkedDiscord] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const clearLink = (key: string) => {
    setLinks((prev) => ({ ...prev, [key]: "" }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300 py-4">
      
      {/* Profile Header */}
      <div className="flex items-center justify-between pb-2">
        <h1 className="text-3xl font-black text-white">User Profile</h1>

        <div className="flex items-center gap-4">
          <Link
            href={`/producers/${profile.id}`}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#7B61FF] hover:underline"
          >
            <span>View Public Showcase</span>
            <ExternalLink className="w-3 h-3" />
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-base font-bold text-white lowercase">{profile.nickname}</span>
            <div className="w-12 h-12 rounded-full overflow-hidden relative">
              <Image
                src={profile.avatarUrl}
                alt={profile.nickname}
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* CONTAINER 1: DETAILS */}
        <div className="bg-[#181818] rounded-2xl p-6 sm:p-8 space-y-5">
          <h2 className="text-lg font-bold text-white">Details</h2>

          {/* Nickname */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <label className="sm:col-span-3 text-sm font-semibold text-[#D1D1D1]">
              Nickname
            </label>
            <div className="sm:col-span-9">
              <input
                type="text"
                value={profile.nickname}
                onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
                className="w-full bg-[#121212] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
                required
              />
            </div>
          </div>

          {/* E-mail */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <label className="sm:col-span-3 text-sm font-semibold text-[#D1D1D1]">
              E-mail
            </label>
            <div className="sm:col-span-9">
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full bg-[#121212] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
                required
              />
            </div>
          </div>
        </div>

        {/* CONTAINER 2: BEAT LICENSING PREFERENCES */}
        <div className="bg-[#181818] rounded-2xl p-6 sm:p-8 space-y-5">
          <h2 className="text-lg font-bold text-white">Beat Licensing Defaults</h2>
          <p className="text-xs text-[#888888]">
            Configure your default licensing tag when uploading beats to the platform.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <label className="sm:col-span-3 text-sm font-semibold text-[#D1D1D1]">
              Default Status
            </label>
            <div className="sm:col-span-9 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDefaultLicensing("for_sale")}
                className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  defaultLicensing === "for_sale"
                    ? "bg-[#7B61FF] text-white shadow-sm"
                    : "bg-[#121212] text-[#888888] hover:text-white"
                }`}
              >
                For Sale (Open to licensing)
              </button>
              <button
                type="button"
                onClick={() => setDefaultLicensing("not_for_sale")}
                className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  defaultLicensing === "not_for_sale"
                    ? "bg-[#7B61FF] text-white shadow-sm"
                    : "bg-[#121212] text-[#888888] hover:text-white"
                }`}
              >
                Not For Sale (Showcase Only)
              </button>
            </div>
          </div>

          {defaultLicensing === "for_sale" && (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <label className="sm:col-span-3 text-sm font-semibold text-[#D1D1D1]">
                Default Price (Optional)
              </label>
              <div className="sm:col-span-9">
                <input
                  type="text"
                  placeholder="e.g. $100 - $200 (optional)"
                  value={defaultPrice}
                  onChange={(e) => setDefaultPrice(e.target.value)}
                  className="w-full bg-[#121212] rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#555555] focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
                />
              </div>
            </div>
          )}
        </div>

        {/* CONTAINER 3: LINKS */}
        <div className="bg-[#181818] rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-lg font-bold text-white">Social & Creator Links</h2>

          {[
            { id: "instagram", label: "Instagram" },
            { id: "beatstars", label: "BeatStars" },
            { id: "spotify", label: "Spotify" },
            { id: "soundcloud", label: "Soundcloud" },
            { id: "youtube", label: "YouTube" },
            { id: "bandcamp", label: "Bandcamp" },
            { id: "facebook", label: "Facebook" },
            { id: "website", label: "Website" },
          ].map((field) => {
            const val = links[field.id] || "";
            return (
              <div key={field.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                <label className="sm:col-span-3 text-sm font-semibold text-[#D1D1D1]">
                  {field.label}
                </label>
                <div className="sm:col-span-9 relative">
                  <input
                    type="url"
                    value={val}
                    onChange={(e) =>
                      setLinks({ ...links, [field.id]: e.target.value })
                    }
                    className="w-full bg-[#121212] rounded-xl pl-4 pr-10 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
                  />
                  {val && (
                    <button
                      type="button"
                      onClick={() => clearLink(field.id)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#7B61FF] text-white flex items-center justify-center hover:bg-[#684DE6] transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CONTAINER 4: DISCORD INTEGRATION */}
        <div className="bg-[#181818] rounded-2xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Discord Account Linking</h2>
            {isLinkedDiscord && (
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Connected (@nerub)</span>
              </span>
            )}
          </div>

          <p className="text-xs sm:text-sm text-[#888888]">
            Syncs your producer role, badges, and judge permissions with our official Discord community.
          </p>

          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#7B61FF]/20 text-[#7B61FF]">
              Host / Admin
            </span>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#FF5E3A]/20 text-[#FF5E3A]">
              OG Producer
            </span>
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => alert("Logged out.")}
            className="px-7 py-3 rounded-xl bg-[#232323] hover:bg-[#2C2C2C] text-[#D1D1D1] text-xs font-semibold transition-all"
          >
            Log out
          </button>

          <button
            type="submit"
            className="px-10 py-3 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white text-xs font-bold transition-all shadow-md active:scale-95"
          >
            {saveSuccess ? "Saved ✓" : "Save"}
          </button>
        </div>

      </form>

    </div>
  );
}
