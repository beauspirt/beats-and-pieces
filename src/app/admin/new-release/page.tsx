"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

export default function NewReleasePage() {
  const router = useRouter();
  const [title, setTitle] = useState("Romanian Hip-Hop Flip Challenge");
  const [description, setDescription] = useState(
    "This is a short description about the release I am currently creating. There's not that much to say at this time but when I'm actually creating one, there might be lots of things to mention.\nThere might even be multiple paragraphs containing all sorts of random information I can't really think about right now.\nAnyway, hope this is enough to give you an idea."
  );
  const [releaseDate, setReleaseDate] = useState("2026-09-01");
  const [links, setLinks] = useState<Record<string, string>>({
    spotify: "https://open.spotify.com/album/5jEacwhNTYagOyRTq...",
    appleMusic: "",
    youtube: "",
    bandcamp: "",
    soundcloud: "",
  });
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => {
      router.push("/releases");
    }, 1500);
  };

  const clearLink = (key: string) => {
    setLinks((prev) => ({ ...prev, [key]: "" }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300 py-4">
      
      {/* Title */}
      <div className="pb-2">
        <h1 className="text-3xl font-black text-white">Create a new release</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* CONTAINER 1: DETAILS */}
        <div className="bg-[#181818] rounded-2xl p-6 sm:p-8 space-y-6">
          <h2 className="text-lg font-bold text-white">Details</h2>

          {/* Title */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <label className="sm:col-span-3 text-sm font-semibold text-[#D1D1D1]">
              Title
            </label>
            <div className="sm:col-span-9">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#121212] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
            <label className="sm:col-span-3 text-sm font-semibold text-[#D1D1D1] pt-2">
              Description
            </label>
            <div className="sm:col-span-9">
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#121212] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF] resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Cover */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <label className="sm:col-span-3 text-sm font-semibold text-[#D1D1D1]">
              Cover
            </label>
            <div className="sm:col-span-9">
              <div className="rounded-xl p-3 bg-[#121212] flex items-center justify-between">
                <span className="text-xs text-[#777777]">Choose file</span>
                <label className="px-4 py-1.5 rounded-lg bg-[#222222] hover:bg-[#2A2A2A] text-xs font-bold text-white cursor-pointer transition-colors">
                  Browse
                  <input type="file" accept="image/*" className="hidden" />
                </label>
              </div>
            </div>
          </div>

          {/* Release Date */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <label className="sm:col-span-3 text-sm font-semibold text-[#D1D1D1]">
              Release date
            </label>
            <div className="sm:col-span-9">
              <input
                type="text"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
                placeholder="YYYY-MM-DD"
                className="w-full bg-[#121212] rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-[#555555] focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
              />
            </div>
          </div>

        </div>

        {/* CONTAINER 2: LINKS */}
        <div className="bg-[#181818] rounded-2xl p-6 sm:p-8 space-y-5">
          <h2 className="text-lg font-bold text-white">Links</h2>

          {[
            { id: "spotify", label: "Spotify" },
            { id: "appleMusic", label: "Apple Music" },
            { id: "youtube", label: "YouTube" },
            { id: "bandcamp", label: "Bandcamp" },
            { id: "soundcloud", label: "Soundcloud" },
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

        {/* Bottom Save Button */}
        <div className="text-right pt-2">
          <button
            type="submit"
            className="px-10 py-3 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white text-sm font-bold transition-all shadow-lg active:scale-95 ml-auto"
          >
            {isSaved ? "Saved ✓" : "Save"}
          </button>
        </div>

      </form>

    </div>
  );
}
