"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Edit3, Plus, Disc, ExternalLink, Music, Radio } from "lucide-react";
import { AdminGuard } from "@/components/AdminGuard";
import { releaseService, storageService } from "@/services";
import { Release } from "@/lib/types";
import { normalizeUrl } from "@/lib/utils";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { ClientPortal } from "@/components/ClientPortal";

export default function AdminReleasesManagerPage() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [editingRelease, setEditingRelease] = useState<Release | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Lock page scrolling when edit release modal is open
  useBodyScrollLock(Boolean(editingRelease));

  useEffect(() => {
    setReleases(releaseService.getAllReleases());
  }, []);

  const handleEditClick = (release: Release) => {
    setEditingRelease({ ...release });
    setIsSaved(false);
  };

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingRelease) {
      const { url } = await storageService.uploadImage(file, "releases");
      if (url) {
        setEditingRelease({
          ...editingRelease,
          coverImage: url,
        });
      } else {
        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
          if (uploadEvent.target?.result) {
            setEditingRelease({
              ...editingRelease,
              coverImage: uploadEvent.target.result as string,
            });
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRelease) return;

    const normalized = {
      ...editingRelease,
      spotifyUrl: normalizeUrl(editingRelease.spotifyUrl || "") || undefined,
      appleMusicUrl: normalizeUrl(editingRelease.appleMusicUrl || "") || undefined,
      youtubeUrl: normalizeUrl(editingRelease.youtubeUrl || "") || undefined,
      bandcampUrl: normalizeUrl(editingRelease.bandcampUrl || "") || undefined,
      soundcloudUrl: normalizeUrl(editingRelease.soundcloudUrl || "") || undefined,
    };

    releaseService.updateRelease(normalized.id, normalized);
    setReleases(releaseService.getAllReleases());
    setIsSaved(true);
    setTimeout(() => {
      setEditingRelease(null);
      setIsSaved(false);
    }, 800);
  };

  return (
    <AdminGuard>
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300 py-4">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs text-[#888888] hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Admin Panel</span>
            </Link>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Disc className="w-7 h-7 text-brand" />
              <span>Edit Release(s)</span>
            </h1>
            <p className="text-xs text-zinc-400">
              Manage official compilation tapes, update descriptions, and edit streaming links.
            </p>
          </div>

          <Link
            href="/admin/new-release"
            className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand/90 text-xs font-bold text-white transition-all shadow-md active:scale-95 flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Release</span>
          </Link>
        </div>

        {/* Releases List */}
        <div className="space-y-3.5">
          {releases.map((release) => (
            <div
              key={release.id}
              className="bg-surface-card rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg hover:bg-surface-hover transition-all"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-14 rounded-xl overflow-hidden relative shrink-0 bg-[#121212] shadow-md">
                  <Image
                    src={release.coverImage}
                    alt={release.title}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="space-y-1 min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{release.title}</h3>
                  <p className="text-xs text-zinc-400">
                    Release Date: {release.releaseDate ? new Date(release.releaseDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A"}
                  </p>
                  <p className="text-xs text-zinc-500 line-clamp-1">
                    {release.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  onClick={() => handleEditClick(release)}
                  className="px-4 py-2 rounded-xl bg-[#222222] hover:bg-brand hover:text-white text-xs font-bold text-zinc-300 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <Link
                  href="/releases"
                  className="px-4 py-2 rounded-xl bg-[#181818] hover:bg-[#252525] text-xs font-bold text-zinc-400 hover:text-white transition-all"
                >
                  View Public
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* EDIT RELEASE MODAL */}
        <ClientPortal>
          {editingRelease && (
            <div
              onClick={() => setEditingRelease(null)}
              className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="bg-[#181818] rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto cursor-default"
              >
                <div className="flex items-center justify-between pb-2">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-brand" />
                    <span>Edit Release Details</span>
                  </h2>
                  <button
                    onClick={() => setEditingRelease(null)}
                    className="w-8 h-8 rounded-full bg-[#121212] text-zinc-400 hover:text-white flex items-center justify-center text-sm cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-5 text-left text-xs">
                  {/* Title */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Release Title</label>
                    <input
                      type="text"
                      value={editingRelease.title}
                      onChange={(e) => setEditingRelease({ ...editingRelease, title: e.target.value })}
                      className="w-full bg-[#121212] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
                      required
                    />
                  </div>

                  {/* Cover Art Upload */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Cover Art</label>
                    <div className="flex items-center gap-4 bg-[#121212] p-3 rounded-xl">
                      <div className="w-16 h-16 rounded-xl overflow-hidden relative bg-[#181818] shrink-0 shadow-md">
                        <Image
                          src={editingRelease.coverImage}
                          alt="Cover Preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex items-center justify-between flex-1">
                        <span className="text-xs text-zinc-400">Change square cover artwork</span>
                        <label className="px-4 py-2 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-xs font-bold text-white cursor-pointer transition-colors shrink-0">
                          Browse File
                          <input type="file" accept="image/*" onChange={handleCoverFileChange} className="hidden" />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Description</label>
                    <textarea
                      rows={4}
                      value={editingRelease.description}
                      onChange={(e) => setEditingRelease({ ...editingRelease, description: e.target.value })}
                      className="w-full bg-[#121212] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                    />
                  </div>

                  {/* Release Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Release Date</label>
                    <input
                      type="date"
                      value={editingRelease.releaseDate ? editingRelease.releaseDate.slice(0, 10) : ""}
                      onChange={(e) => setEditingRelease({ ...editingRelease, releaseDate: e.target.value })}
                      className="w-full bg-[#121212] rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                  </div>

                  {/* Streaming Links */}
                  <div className="space-y-3 bg-[#121212] p-4 rounded-xl">
                    <label className="font-bold text-white uppercase tracking-wider text-xs block">
                      Streaming Links
                    </label>

                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-zinc-400 block mb-1">Spotify</label>
                        <input
                          type="url"
                          value={editingRelease.spotifyUrl || ""}
                          onChange={(e) => setEditingRelease({ ...editingRelease, spotifyUrl: e.target.value })}
                          className="w-full bg-[#181818] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-zinc-400 block mb-1">Apple Music</label>
                        <input
                          type="url"
                          value={editingRelease.appleMusicUrl || ""}
                          onChange={(e) => setEditingRelease({ ...editingRelease, appleMusicUrl: e.target.value })}
                          className="w-full bg-[#181818] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-zinc-400 block mb-1">YouTube</label>
                        <input
                          type="url"
                          value={editingRelease.youtubeUrl || ""}
                          onChange={(e) => setEditingRelease({ ...editingRelease, youtubeUrl: e.target.value })}
                          className="w-full bg-[#181818] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-zinc-400 block mb-1">Bandcamp</label>
                        <input
                          type="url"
                          value={editingRelease.bandcampUrl || ""}
                          onChange={(e) => setEditingRelease({ ...editingRelease, bandcampUrl: e.target.value })}
                          className="w-full bg-[#181818] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-zinc-400 block mb-1">SoundCloud</label>
                        <input
                          type="url"
                          value={editingRelease.soundcloudUrl || ""}
                          onChange={(e) => setEditingRelease({ ...editingRelease, soundcloudUrl: e.target.value })}
                          className="w-full bg-[#181818] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setEditingRelease(null)}
                      className="px-5 py-2.5 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-7 py-2.5 rounded-xl bg-brand hover:bg-brand/90 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      {isSaved ? "Saved ✓" : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </ClientPortal>

      </div>
    </AdminGuard>
  );
}
