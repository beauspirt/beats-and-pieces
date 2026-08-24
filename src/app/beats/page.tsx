"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { sampleDiscoveryBeats } from "@/lib/mock-data";
import { AudioWaveformPlayer } from "@/components/AudioWaveformPlayer";
import { DiscoveryBeat } from "@/lib/types";
import { beatService } from "@/services/beatService";
import { producerService } from "@/services/producerService";
import { JudgeFeedbackTicker } from "@/components/JudgeFeedbackTicker";
import { useAuth } from "@/lib/auth-context";
import { Search, Filter, SlidersHorizontal, Star, Flame, ChevronDown, Upload, Check } from "lucide-react";

export default function BeatsDiscoveryPage() {
  const { user: currentUser } = useAuth();
  const [beats, setBeats] = useState<DiscoveryBeat[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedSaleFilter, setSelectedSaleFilter] = useState<"all" | "for_sale" | "not_for_sale">("all");
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<"recent" | "rating">("recent");
  const [showFilters, setShowFilters] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);

  // Pagination: 15 beats at a time
  const [visibleCount, setVisibleCount] = useState(15);

  // Close sort menu on click outside only when open
  useEffect(() => {
    if (!isSortOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isSortOpen]);

  // Load fresh beats from beatService (including user custom beats) & favorites from localStorage
  useEffect(() => {
    const refresh = () => {
      const allBeats = beatService.getAllDiscoveryBeats();
      try {
        const savedFavs = localStorage.getItem("bnp_favorites");
        const favIds: string[] = savedFavs ? JSON.parse(savedFavs) : [];
        setBeats(
          allBeats.map((b) => ({
            ...b,
            isFavorite: favIds.includes(b.id),
          }))
        );
      } catch {
        setBeats(allBeats);
      }
    };

    refresh();
    beatService.syncFromSupabase().then(refresh);

    window.addEventListener("bnp_beats_updated", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("bnp_beats_updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  // Reset pagination when search or filters change
  useEffect(() => {
    setVisibleCount(15);
  }, [searchQuery, selectedTags, selectedSaleFilter, showOnlyFavorites, sortBy]);

  const toggleFavorite = (beatId: string) => {
    setBeats((prev) => {
      const updated = prev.map((b) => (b.id === beatId ? { ...b, isFavorite: !b.isFavorite } : b));
      try {
        const favIds = updated.filter((b) => b.isFavorite).map((b) => b.id);
        localStorage.setItem("bnp_favorites", JSON.stringify(favIds));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const filteredBeats = useMemo(() => {
    return beats
      .filter((beat) => {
        const q = searchQuery.toLowerCase().trim();
        const title = beat.title.toLowerCase();
        const producerTag = beat.beatmaker.tag.toLowerCase();
        const tags = Array.isArray(beat.tags) ? beat.tags : [];
        const genres = Array.isArray(beat.genres) ? beat.genres : [];

        const matchesQuery =
          !q ||
          title.includes(q) ||
          producerTag.includes(q) ||
          tags.some((t) => (t || "").toLowerCase().includes(q)) ||
          genres.some((g) => (g || "").toLowerCase().includes(q));

        const matchesTags =
          selectedTags.length === 0 ||
          selectedTags.some((tag) => tags.includes(tag) || genres.includes(tag));

        const matchesSale =
          selectedSaleFilter === "all" ||
          (selectedSaleFilter === "for_sale" && beat.priceTag !== "Not For Sale") ||
          (selectedSaleFilter === "not_for_sale" && beat.priceTag === "Not For Sale");

        const matchesFav = !showOnlyFavorites || beat.isFavorite;

        return matchesQuery && matchesTags && matchesSale && matchesFav;
      })
      .sort((a, b) => {
        if (sortBy === "recent") {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          const diff = timeB - timeA;
          if (diff !== 0) return diff;
          return (b.id || "").localeCompare(a.id || "");
        }
        if (sortBy === "rating") {
          const scoreA = (typeof a.flames === "number" && a.flames > 0) 
            ? a.flames 
            : ((typeof a.juryScore === "number" && a.juryScore > 0) 
                ? a.juryScore 
                : (a.rank === 1 ? 5 : a.rank === 2 ? 4 : a.rank === 3 ? 3 : 0));
          const scoreB = (typeof b.flames === "number" && b.flames > 0) 
            ? b.flames 
            : ((typeof b.juryScore === "number" && b.juryScore > 0) 
                ? b.juryScore 
                : (b.rank === 1 ? 5 : b.rank === 2 ? 4 : b.rank === 3 ? 3 : 0));
          const diff = scoreB - scoreA;
          if (diff !== 0) return diff;
          return (b.id || "").localeCompare(a.id || "");
        }
        return 0;
      });
  }, [beats, searchQuery, selectedTags, selectedSaleFilter, showOnlyFavorites, sortBy]);

  const activeFiltersCount =
    selectedTags.length +
    (selectedSaleFilter !== "all" ? 1 : 0);

  const allGenres = Array.from(
    new Set(
      beats.flatMap((b) => [
        ...(Array.isArray(b.genres) ? b.genres : []),
        ...(Array.isArray(b.tags) ? b.tags : []),
      ])
    )
  );
  const visibleBeats = filteredBeats.slice(0, visibleCount);

  const sortLabelMap: Record<"recent" | "rating", string> = {
    recent: "Most Recent",
    rating: "Top Rated",
  };

  return (
    <div className="space-y-4 w-full animate-in fade-in duration-300">
      
      {/* Unified Search, Favorites, Filter, Sort, & Upload Beat Action Bar */}
      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          
          {/* Search Bar */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by title, producer, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#181818] rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
            />
            <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
          </div>

          {/* Quick Action Controls Row: Favorites + Filter + Sort Criteria Dropdown + Upload Beat Button */}
          <div className="grid grid-cols-4 sm:flex items-center gap-2 sm:gap-3 w-full lg:w-auto">
            {/* Favorites Filter Button */}
            <button
              type="button"
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
              className={`w-full sm:w-auto h-11 sm:h-auto px-2 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                showOnlyFavorites
                  ? "bg-amber-500/20 text-amber-300 shadow-sm"
                  : "bg-[#181818] hover:bg-[#202020] text-zinc-400 hover:text-white"
              }`}
              title={showOnlyFavorites ? "Show all beats" : "Show only favorites"}
              aria-label="Favorites"
            >
              <Star className={`w-4 h-4 shrink-0 ${showOnlyFavorites ? "fill-amber-400 text-amber-400" : ""}`} />
              <span className="hidden sm:inline">Favorites</span>
            </button>

            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`w-full sm:w-auto h-11 sm:h-auto px-2 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                showFilters || activeFiltersCount > 0
                  ? "bg-[#7B61FF] text-white"
                  : "bg-[#181818] hover:bg-[#202020] text-zinc-400 hover:text-white"
              }`}
              title="Toggle filters"
              aria-label="Filter"
            >
              <Filter className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Filter</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-white text-[#7B61FF] text-[10px] font-bold flex items-center justify-center shrink-0">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Redesigned Sleek Sort Dropdown */}
            <div className="relative w-full sm:w-auto sm:flex-initial" ref={sortMenuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsSortOpen((prev) => !prev);
                }}
                className="w-full h-11 sm:h-auto flex items-center justify-between sm:justify-center gap-1 sm:gap-2 bg-[#181818] hover:bg-[#202020] rounded-xl px-2 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-white font-semibold transition-all cursor-pointer"
              >
                <div className="flex items-center gap-1 truncate">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#7B61FF] shrink-0" />
                  <span className="truncate">{sortLabelMap[sortBy]}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 shrink-0 ${isSortOpen ? "rotate-180" : ""}`} />
              </button>

              {isSortOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 mt-2 w-44 bg-[#181818] rounded-2xl shadow-2xl p-2 z-[100] space-y-1 animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  {(["recent", "rating"] as const).map((key) => {
                    const isSelected = sortBy === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSortBy(key);
                          setIsSortOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#7B61FF] text-white"
                            : "text-zinc-300 hover:bg-[#222222] hover:text-white"
                        }`}
                      >
                        <span>{sortLabelMap[key]}</span>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Upload Beat Button */}
            <Link
              href={currentUser?.id ? `/${currentUser.id}` : "/profile"}
              className="w-full sm:w-auto h-11 sm:h-auto inline-flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95 cursor-pointer text-center"
            >
              <Upload className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline sm:inline whitespace-nowrap">Upload Beat</span>
              <span className="xs:hidden sm:hidden whitespace-nowrap">Upload</span>
            </Link>

          </div>
        </div>

        {/* Selected Tags Pill Strip */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-zinc-400 font-medium mr-1">Active Tags:</span>
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7B61FF]/15 text-[#A78BFA] text-xs font-semibold"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className="text-zinc-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => setSelectedTags([])}
              className="text-xs text-zinc-500 hover:text-red-400 underline underline-offset-2 ml-1 cursor-pointer transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Expandable Filter Drawer */}
        {showFilters && (
          <div className="bg-[#181818] rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Filter Catalogue
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedTags([]);
                  setSelectedSaleFilter("all");
                  setShowOnlyFavorites(false);
                }}
                className="text-xs text-[#7B61FF] hover:underline font-semibold cursor-pointer"
              >
                Reset Filters
              </button>
            </div>

            {/* Genre Filters with Multi-Select support */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-300 font-semibold block">Genre / Style (Select multiple)</span>
                {selectedTags.length > 0 && (
                  <span className="text-[11px] text-[#7B61FF] font-medium">{selectedTags.length} selected</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTags([])}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    selectedTags.length === 0
                      ? "bg-[#7B61FF] text-white"
                      : "bg-[#121212] text-zinc-400 hover:text-white"
                  }`}
                >
                  All Genres
                </button>
                {allGenres.map((genre) => {
                  const isSelected = selectedTags.includes(genre);
                  return (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => handleTagToggle(genre)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-[#7B61FF] text-white shadow-sm"
                          : "bg-[#121212] text-zinc-400 hover:text-white"
                      }`}
                    >
                      <span>{genre}</span>
                      {isSelected && <span className="text-[10px] opacity-80">✕</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Tag / Availability Filters */}
            <div className="space-y-2 pt-2 border-t border-[#222222]">
              <span className="text-xs text-zinc-300 font-semibold block">Licensing / Price Status</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSaleFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    selectedSaleFilter === "all"
                      ? "bg-[#7B61FF] text-white"
                      : "bg-[#121212] text-[#888888] hover:text-white"
                  }`}
                >
                  All Beats
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSaleFilter("for_sale")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    selectedSaleFilter === "for_sale"
                      ? "bg-[#7B61FF] text-white"
                      : "bg-[#121212] text-[#888888] hover:text-white"
                  }`}
                >
                  Available For Sale / License
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSaleFilter("not_for_sale")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    selectedSaleFilter === "not_for_sale"
                      ? "bg-[#7B61FF] text-white"
                      : "bg-[#121212] text-[#888888] hover:text-white"
                  }`}
                >
                  Showcase Only
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Beats Feed List */}
      <div className="space-y-4">
        {visibleBeats.length === 0 ? (
          <div className="bg-[#181818] rounded-2xl p-10 sm:p-14 text-center space-y-3">
            {showOnlyFavorites ? (
              <div className="space-y-3 max-w-sm mx-auto animate-in fade-in duration-200">
                <div className="w-12 h-12 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto">
                  <Star className="w-5 h-5 fill-amber-400" />
                </div>
                <p className="text-white font-semibold text-base sm:text-lg">
                  You have no beats added to your favorites.
                </p>
                <p className="text-xs text-zinc-400">
                  Click the star icon on any beat to save it to your favorites list for quick access.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowOnlyFavorites(false)}
                    className="px-5 py-2.5 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>Explore Beats</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-white font-semibold">No beats match your search criteria.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedTags([]);
                    setSelectedSaleFilter("all");
                    setShowOnlyFavorites(false);
                  }}
                  className="text-xs text-[#7B61FF] hover:underline font-semibold cursor-pointer"
                >
                  Clear filters and search
                </button>
              </div>
            )}
          </div>
        ) : (
          visibleBeats.map((beat) => {
            const prod = producerService.getProducerById(beat.beatmaker.id) || producerService.getProducerByTag(beat.beatmaker.tag);
            const displayTag = prod?.nickname || beat.beatmaker.tag;
            const displayAvatar = prod?.avatarUrl || beat.beatmaker.avatarUrl || "/avatars/default-avatar.png";
            const match =
              (beat.battleSource && beat.battleSource.match(/Beat Battle #?(\d+)/i)) ||
              (beat.id && beat.id.match(/disc-bb(\d+)/));

            return (
              <div
                key={beat.id}
                className="bg-[#181818] rounded-2xl p-4 sm:p-5 space-y-3.5 sm:space-y-4 shadow-md"
              >
                {/* Row 1: Header (Title, Producer, Avatar, Badges, Meta) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* Left: Beat Title + Producer Avatar/Tag + Badges */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <Link
                      href={`/${beat.beatmaker.id}`}
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden relative shrink-0 hover:opacity-80 transition-opacity bg-[#121212]"
                    >
                      <Image
                        src={displayAvatar}
                        alt={displayTag}
                        fill
                        className="object-cover"
                      />
                    </Link>

                    <div className="min-w-0 flex-1">
                      {/* Title & Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-white text-base sm:text-lg leading-snug">
                          {beat.title}
                        </h3>

                        {beat.rank === 1 && (
                          <span className="h-5 sm:h-6 px-2.5 sm:px-3 rounded-full bg-[#FF5E3A]/20 text-[#FF5E3A] text-[11px] sm:text-xs font-bold inline-flex items-center justify-center leading-none">
                            1st Place
                          </span>
                        )}
                        {beat.rank === 2 && (
                          <span className="h-5 sm:h-6 px-2.5 sm:px-3 rounded-full bg-[#1E232A] text-[#94A3B8] text-[11px] sm:text-xs font-bold inline-flex items-center justify-center leading-none">
                            2nd Place
                          </span>
                        )}
                        {beat.rank === 3 && (
                          <span className="h-5 sm:h-6 px-2.5 sm:px-3 rounded-full bg-[#FF5E3A]/10 text-[#FF8A65] text-[11px] sm:text-xs font-bold inline-flex items-center justify-center leading-none">
                            3rd Place
                          </span>
                        )}

                        {match && (
                          <Link
                            href={`/battles/battle-${match[1]}`}
                            className="px-2 py-0.5 rounded-md bg-[#7B61FF]/15 text-[#A78BFA] hover:bg-[#7B61FF]/25 hover:text-white text-[11px] font-bold shrink-0 transition-all inline-flex items-center gap-1"
                            title={`View ${beat.battleSource || `Beat Battle #${match[1]}`}`}
                          >
                            <span>BB#{match[1]}</span>
                            <span className="text-[9px]">↗</span>
                          </Link>
                        )}
                      </div>

                      {/* Beatmaker name */}
                      <Link
                        href={`/${beat.beatmaker.id}`}
                        className="text-xs sm:text-sm text-[#7B61FF] hover:underline font-semibold block truncate mt-0.5"
                      >
                        {displayTag}
                      </Link>
                    </div>
                  </div>

                  {/* Right: Meta Badges (BPM, Price, Flames, Fav) */}
                  <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-wrap sm:flex-nowrap select-none">
                    {/* BPM */}
                    {beat.bpm ? (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#121212] text-[#888888] select-none">
                        {beat.bpm} BPM
                      </span>
                    ) : null}

                    {/* Price Tag Pill */}
                    {beat.priceTag ? (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold select-none ${
                          beat.priceTag === "Not For Sale"
                            ? "bg-[#121212] text-[#666666]"
                            : "bg-[#FF5E3A]/20 text-[#FF5E3A]"
                        }`}
                      >
                        {beat.priceTag}
                      </span>
                    ) : null}

                    {/* Jury Score Avg */}
                    {typeof beat.juryScore === "number" && beat.juryScore > 0 ? (
                      <div className="flex items-center gap-1 text-xs sm:text-sm text-[#7B61FF] font-bold px-1.5 select-none" title="Jury Score Average">
                        <Star className="w-4 h-4 fill-current text-[#7B61FF]" />
                        <span>{beat.juryScore.toFixed(2)}</span>
                      </div>
                    ) : null}

                    {/* Community Flames (Public Rating Avg) */}
                    {typeof beat.flames === "number" && beat.flames >= 1 ? (
                      <div className="flex items-center gap-1 text-xs sm:text-sm text-[#FF5E3A] font-bold px-1.5 select-none" title="Public Rating Average">
                        <Flame className="w-4 h-4 fill-current" />
                        <span>{beat.flames.toFixed(2)}</span>
                      </div>
                    ) : null}

                    {/* Favorite Button */}
                    <button
                      type="button"
                      onClick={() => toggleFavorite(beat.id)}
                      className="p-2 rounded-xl bg-[#121212] hover:bg-[#202020] transition-colors text-[#888888] hover:text-amber-400 cursor-pointer ml-auto sm:ml-0 select-none"
                      title={beat.isFavorite ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          beat.isFavorite ? "fill-amber-400 text-amber-400" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Row 2: Full Waveform Player */}
                <AudioWaveformPlayer
                  id={`disc-${beat.id}`}
                  title={beat.title}
                  artist={displayTag}
                  artistId={beat.beatmaker.id}
                  coverUrl={beat.beatmaker.avatarUrl}
                  audioUrl={beat.audioUrl}
                  waveformPeaks={beat.waveform}
                  duration={beat.duration}
                  bpm={beat.bpm}
                  compact={true}
                />

                {/* Row 3: Clickable Genre & Tags */}
                {((beat.genres && beat.genres.length > 0) || (beat.tags && beat.tags.length > 0)) ? (
                  <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs select-none">
                    {beat.genres?.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => handleTagToggle(g)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer select-none ${
                          selectedTags.includes(g)
                            ? "bg-[#7B61FF] text-white"
                            : "bg-[#121212] text-[#888888] hover:text-white hover:bg-[#202020]"
                        }`}
                      >
                        {g}
                      </button>
                    ))}

                    {beat.tags.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleTagToggle(t)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer select-none ${
                          selectedTags.includes(t)
                            ? "bg-[#7B61FF] text-white"
                            : "bg-[#121212] text-[#777777] hover:text-white hover:bg-[#202020]"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                ) : null}

                {/* Row 4: Judge Feedback Ticker */}
                {beat.juryFeedbacks && beat.juryFeedbacks.length > 0 && (
                  <JudgeFeedbackTicker feedbacks={beat.juryFeedbacks} />
                )}

              </div>
            );
          })
        )}
      </div>

      {/* Load More Pagination Button */}
      {filteredBeats.length > visibleCount && (
        <div className="flex justify-center pt-6 pb-6">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 15)}
            className="px-8 py-3.5 rounded-xl bg-[#181818] hover:bg-[#222222] text-white text-sm font-bold transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <span>Load More Beats (+15)</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
}
