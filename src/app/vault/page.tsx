"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, ExternalLink, Sparkles, Video, ListMusic, Music, Radio, Disc3 } from "lucide-react";
import { vaultService } from "@/services/vaultService";
import { producerService } from "@/services/producerService";
import { VaultItem } from "@/lib/types";

const CATEGORIES = [
  { key: "all", label: "All Vault" },
  { key: "breakdowns", label: "Beat Breakdowns" },
  { key: "live-sets", label: "Live Sets" },
  { key: "challenges", label: "Challenges & Remixes" },
  { key: "weekly-flips", label: "Weekly Flips" },
] as const;

export default function VaultPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeModalItem, setActiveModalItem] = useState<VaultItem | null>(null);

  const allItems = useMemo(() => vaultService.getAllVaultItems(), []);

  const filteredItems = useMemo(() => {
    if (selectedCategory === "all") return allItems;
    return allItems.filter((item) => item.category === selectedCategory);
  }, [allItems, selectedCategory]);

  const breakdowns = useMemo(
    () => allItems.filter((i) => i.category === "breakdowns"),
    [allItems]
  );
  const liveSets = useMemo(
    () => allItems.filter((i) => i.category === "live-sets"),
    [allItems]
  );
  const challenges = useMemo(
    () => allItems.filter((i) => i.category === "challenges"),
    [allItems]
  );
  const weeklyFlips = useMemo(
    () => allItems.filter((i) => i.category === "weekly-flips"),
    [allItems]
  );

  const handleOpenVideo = (item: VaultItem) => {
    if (item.youtubeId) {
      setActiveModalItem(item);
    } else {
      window.open(item.youtubeUrl, "_blank", "noopener,noreferrer");
    }
  };

  const renderCard = (item: VaultItem) => {
    const prod = item.producerId
      ? producerService.getProducerById(item.producerId)
      : item.producerTag
      ? producerService.getProducerByTag(item.producerTag)
      : null;

    const thumbnailUrl = item.youtubeId
      ? `https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg`
      : null;

    return (
      <div
        key={item.id}
        className="bg-[#181818] rounded-2xl overflow-hidden flex flex-col justify-between group hover:bg-[#1f1f1f] transition-all duration-200 shadow-lg"
      >
        {/* Thumbnail Preview Area */}
        <div
          onClick={() => handleOpenVideo(item)}
          className="w-full aspect-video relative bg-[#121212] overflow-hidden cursor-pointer flex items-center justify-center select-none"
        >
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={item.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1C1A24] to-[#121212] flex flex-col items-center justify-center p-4 text-center">
              <ListMusic className="w-10 h-10 text-[#7B61FF] mb-2 opacity-80" />
              <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                {item.categoryLabel}
              </span>
            </div>
          )}

          {/* Hover Overlay with Play Button */}
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-black/70 backdrop-blur-sm group-hover:bg-[#7B61FF] text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-all duration-200">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>
          </div>

          {/* Category Tag Badge */}
          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md text-white text-[11px] font-bold tracking-wide">
              {item.categoryLabel}
            </span>
          </div>

          {/* Type / Duration Indicator */}
          {item.type === "playlist" && (
            <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[11px] text-zinc-300 font-semibold flex items-center gap-1">
              <ListMusic className="w-3 h-3 text-[#7B61FF]" />
              <span>Playlist</span>
            </div>
          )}
        </div>

        {/* Card Content & Actions */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <h3
              onClick={() => handleOpenVideo(item)}
              className="text-base sm:text-lg font-bold text-white leading-snug group-hover:text-[#A78BFA] transition-colors cursor-pointer"
            >
              {item.title}
            </h3>

            {item.description && (
              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            )}
          </div>

          {/* Footer: Producer info & External Link */}
          <div className="pt-2 flex items-center justify-between gap-3">
            {prod ? (
              <Link
                href={`/producers/${prod.id}`}
                className="flex items-center gap-2 group/prod text-xs font-semibold text-zinc-300 hover:text-white truncate"
              >
                <div className="w-6 h-6 rounded-full overflow-hidden relative shrink-0 bg-[#222222]">
                  <Image
                    src={prod.avatarUrl || "/avatars/default-avatar.png"}
                    alt={prod.nickname}
                    fill
                    className="object-cover"
                  />
                </div>
                <span className="truncate group-hover/prod:text-[#7B61FF] transition-colors">
                  {prod.nickname}
                </span>
              </Link>
            ) : item.producerTag ? (
              <span className="text-xs text-zinc-400 font-semibold truncate">
                {item.producerTag}
              </span>
            ) : item.venue ? (
              <span className="text-xs text-zinc-400 font-medium truncate">
                📍 {item.venue}
              </span>
            ) : (
              <div />
            )}

            <a
              href={item.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-[#222222] hover:bg-[#2c2c2c] text-zinc-400 hover:text-white text-xs transition-colors inline-flex items-center gap-1 shrink-0"
              title="Watch on YouTube"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-10 py-2 animate-in fade-in duration-300">
      
      {/* Header & Filter Row */}
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Vault
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Explore producer studio breakdowns, live club sets, remix challenges, and the weekly flips archive.
          </p>
        </div>

        {/* Category Pill Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#7B61FF] text-white shadow-md scale-100"
                    : "bg-[#181818] text-zinc-400 hover:text-white hover:bg-[#222222]"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* VIEW 1: Filtered Category View (when not 'all') */}
      {selectedCategory !== "all" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map(renderCard)}
          </div>
        </div>
      )}

      {/* VIEW 2: Complete Organized Sections View (when 'all' is active) */}
      {selectedCategory === "all" && (
        <div className="space-y-12">
          
          {/* Section 1: Beat Breakdowns */}
          {breakdowns.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Video className="w-5 h-5 text-[#7B61FF]" />
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    Beat Breakdowns
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedCategory("breakdowns")}
                  className="text-xs text-zinc-400 hover:text-[#7B61FF] font-semibold transition-colors cursor-pointer"
                >
                  View all ({breakdowns.length}) →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {breakdowns.map(renderCard)}
              </div>
            </section>
          )}

          {/* Section 2: Live Sets */}
          {liveSets.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Disc3 className="w-5 h-5 text-[#FF5E3A]" />
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    Live Sets @ Control Club
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedCategory("live-sets")}
                  className="text-xs text-zinc-400 hover:text-[#FF5E3A] font-semibold transition-colors cursor-pointer"
                >
                  View all ({liveSets.length}) →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveSets.map(renderCard)}
              </div>
            </section>
          )}

          {/* Section 3: Challenges & Remixes */}
          {challenges.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    Challenges & Remix Contests
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedCategory("challenges")}
                  className="text-xs text-zinc-400 hover:text-amber-400 font-semibold transition-colors cursor-pointer"
                >
                  View all ({challenges.length}) →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {challenges.map(renderCard)}
              </div>
            </section>
          )}

          {/* Section 4: Weekly Flips */}
          {weeklyFlips.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Music className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    Weekly Flips Archive
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedCategory("weekly-flips")}
                  className="text-xs text-zinc-400 hover:text-emerald-400 font-semibold transition-colors cursor-pointer"
                >
                  View all ({weeklyFlips.length}) →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {weeklyFlips.map(renderCard)}
              </div>
            </section>
          )}

        </div>
      )}

      {/* In-App Video Modal Player */}
      {activeModalItem && activeModalItem.youtubeId && (
        <div
          onClick={() => setActiveModalItem(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#181818] rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl space-y-4 p-4 sm:p-6 relative cursor-default border border-white/5"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-md bg-[#7B61FF]/20 text-[#A78BFA] text-[11px] font-bold">
                  {activeModalItem.categoryLabel}
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-white leading-snug">
                  {activeModalItem.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveModalItem(null)}
                className="w-8 h-8 rounded-full bg-[#121212] text-zinc-400 hover:text-white flex items-center justify-center text-sm cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Embedded 16:9 YouTube Player */}
            <div className="w-full aspect-video rounded-xl overflow-hidden bg-black relative shadow-inner">
              <iframe
                src={`https://www.youtube.com/embed/${activeModalItem.youtubeId}?autoplay=1`}
                title={activeModalItem.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs text-zinc-400">
              <p className="line-clamp-2 max-w-xl">{activeModalItem.description}</p>
              <a
                href={activeModalItem.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-[#222222] hover:bg-[#2c2c2c] text-white font-semibold flex items-center gap-2 shrink-0 transition-colors"
              >
                <span>Watch on YouTube</span>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
