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
            <span className="text-base font-bold text-white">{profile.nickname}</span>
            <div className="w-12 h-12 rounded-full overflow-hidden relative border border-white/10">
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
        <div className="bg-[#181818] rounded-2xl p-6 sm:p-8 space-y-5 shadow-lg">
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

          {/* Google E-mail (Auto-populated from Google Auth) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <label className="sm:col-span-3 text-sm font-semibold text-[#D1D1D1]">
              Google E-mail
            </label>
            <div className="sm:col-span-9">
              <div className="w-full bg-[#121212] border border-white/5 rounded-xl px-4 py-3 text-sm text-[#E0E0E0] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 truncate">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.5 0 2.9.5 4 1.4l3-3C17.2 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
                    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9c-.2-.7-.4-1.5-.4-2.3z"/>
                    <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"/>
                  </svg>
                  <span className="font-mono text-sm text-white select-all">{profile.email}</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full flex items-center gap-1.5 shrink-0 select-none">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Google Auth</span>
                </span>
              </div>
              <span className="text-[11px] text-[#666666] mt-1.5 block">
                Your account is connected via Google OAuth.
              </span>
            </div>
          </div>
        </div>

        {/* CONTAINER 2: BEAT LICENSING PREFERENCES */}
        <div className="bg-[#181818] rounded-2xl p-6 sm:p-8 space-y-5 shadow-lg">
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
        <div className="bg-[#181818] rounded-2xl p-6 sm:p-8 space-y-4 shadow-lg">
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

        {/* BOTTOM ACTION BUTTONS */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => alert("Logged out.")}
            className="px-7 py-3 rounded-xl bg-[#232323] hover:bg-[#2C2C2C] text-[#D1D1D1] text-xs font-semibold transition-all cursor-pointer"
          >
            Log out
          </button>

          <button
            type="submit"
            className="px-10 py-3 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            {saveSuccess ? "Saved ✓" : "Save"}
          </button>
        </div>

      </form>

    </div>
  );
}
