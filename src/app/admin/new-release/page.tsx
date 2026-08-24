"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { X, ArrowLeft, Disc } from "lucide-react";
import { AdminGuard } from "@/components/AdminGuard";
import { releaseService, storageService } from "@/services";
import { normalizeUrl } from "@/lib/utils";

export default function NewReleasePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [coverImage, setCoverImage] = useState("/covers/beat-battle-8.png");
  const [description, setDescription] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [appleMusicUrl, setAppleMusicUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [bandcampUrl, setBandcampUrl] = useState("");
  const [soundcloudUrl, setSoundcloudUrl] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const { url } = await storageService.uploadImage(file, "releases");
      if (url) {
        setCoverImage(url);
      } else {
        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
          if (uploadEvent.target?.result) {
            setCoverImage(uploadEvent.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaved(true);

    releaseService.createRelease({
      title: title.trim(),
      coverImage: coverImage,
      description: description.trim(),
      releaseDate: releaseDate ? new Date(releaseDate).toISOString() : new Date().toISOString(),
      spotifyUrl: normalizeUrl(spotifyUrl) || undefined,
      appleMusicUrl: normalizeUrl(appleMusicUrl) || undefined,
      youtubeUrl: normalizeUrl(youtubeUrl) || undefined,
      bandcampUrl: normalizeUrl(bandcampUrl) || undefined,
      soundcloudUrl: normalizeUrl(soundcloudUrl) || undefined,
    });

    setTimeout(() => {
      router.push("/releases");
    }, 1000);
  };

  return (
    <AdminGuard>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300 py-4">
      
        {/* Top Header & Breadcrumb */}
        <div className="space-y-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-[#888888] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Admin Panel</span>
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Disc className="w-7 h-7 text-brand" />
            <span>Create a New Release</span>
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* CONTAINER 1: DETAILS */}
          <div className="bg-[#181818] rounded-3xl p-6 sm:p-8 space-y-6">
            <h2 className="text-2xl font-bold text-white">Details</h2>

            {/* Title */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <label className="sm:col-span-3 text-xs font-bold text-[#D1D1D1]">
                Title
              </label>
              <div className="sm:col-span-9">
                <input
                  type="text"
                  placeholder="e.g. Beats & Pieces - Flip Tape #3"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#121212] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
                  required
                />
              </div>
            </div>

            {/* Cover Art Upload */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <label className="sm:col-span-3 text-xs font-bold text-[#D1D1D1]">
                Cover Art
              </label>
              <div className="sm:col-span-9">
                <div className="flex items-center gap-4 bg-[#121212] p-3 rounded-3xl">
                  <div className="w-16 h-16 rounded-3xl overflow-hidden relative bg-[#181818] shrink-0 shadow-md">
                    <Image
                      src={coverImage}
                      alt="Cover Preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between flex-1">
                    <span className="text-xs text-[#777777]">Upload square cover artwork</span>
                    <label className="px-4 py-2 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-xs font-bold text-white cursor-pointer transition-colors shrink-0">
                      Browse File
                      <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
              <label className="sm:col-span-3 text-xs font-bold text-[#D1D1D1] pt-2">
                Description
              </label>
              <div className="sm:col-span-9">
                <textarea
                  rows={4}
                  placeholder="Compilation tracklist, producer credits, and release details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#121212] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF] resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* Release Date */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <label className="sm:col-span-3 text-xs font-bold text-[#D1D1D1]">
                Release Date
              </label>
              <div className="sm:col-span-9">
                <input
                  type="date"
                  value={releaseDate}
                  onChange={(e) => setReleaseDate(e.target.value)}
                  className="w-full bg-[#121212] rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
                />
              </div>
            </div>

          </div>

          {/* CONTAINER 2: STREAMING LINKS */}
          <div className="bg-[#181818] rounded-3xl p-6 sm:p-8 space-y-5">
            <h2 className="text-2xl font-bold text-white">Streaming Links</h2>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <label className="sm:col-span-3 text-xs font-bold text-[#D1D1D1]">Spotify</label>
              <div className="sm:col-span-9">
                <input
                  type="url"
                  value={spotifyUrl}
                  onChange={(e) => setSpotifyUrl(e.target.value)}
                  className="w-full bg-[#121212] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <label className="sm:col-span-3 text-xs font-bold text-[#D1D1D1]">Apple Music</label>
              <div className="sm:col-span-9">
                <input
                  type="url"
                  value={appleMusicUrl}
                  onChange={(e) => setAppleMusicUrl(e.target.value)}
                  className="w-full bg-[#121212] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <label className="sm:col-span-3 text-xs font-bold text-[#D1D1D1]">YouTube</label>
              <div className="sm:col-span-9">
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="w-full bg-[#121212] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <label className="sm:col-span-3 text-xs font-bold text-[#D1D1D1]">Bandcamp</label>
              <div className="sm:col-span-9">
                <input
                  type="url"
                  value={bandcampUrl}
                  onChange={(e) => setBandcampUrl(e.target.value)}
                  className="w-full bg-[#121212] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <label className="sm:col-span-3 text-xs font-bold text-[#D1D1D1]">SoundCloud</label>
              <div className="sm:col-span-9">
                <input
                  type="url"
                  value={soundcloudUrl}
                  onChange={(e) => setSoundcloudUrl(e.target.value)}
                  className="w-full bg-[#121212] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

          </div>

          {/* Bottom Save Button */}
          <div className="text-right pt-2">
            <button
              type="submit"
              className="px-10 py-3 rounded-3xl bg-[#7B61FF] hover:bg-[#684DE6] text-white text-xs font-bold transition-all shadow-lg active:scale-95 ml-auto cursor-pointer"
            >
              {isSaved ? "Saved ✓" : "Create Release"}
            </button>
          </div>

        </form>

      </div>
    </AdminGuard>
  );
}
