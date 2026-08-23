"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { sampleDiscoveryBeats } from "@/lib/mock-data";
import { AudioWaveformPlayer } from "@/components/AudioWaveformPlayer";
import { DiscoveryBeat } from "@/lib/types";
import { beatService } from "@/services/beatService";
import { producerService } from "@/services/producerService";
import { Search, Filter, ArrowUpDown, Star, Flame, ChevronDown } from "lucide-react";

export default function BeatsDiscoveryPage() {
  const [beats, setBeats] = useState<DiscoveryBeat[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [selectedSaleFilter, setSelectedSaleFilter] = useState<"all" | "for_sale" | "not_for_sale">("all");
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<"recent" | "rating" | "bpm" | "title">("recent");
  const [showFilters, setShowFilters] = useState(false);

  // Pagination: 15 beats at a time
  const [visibleCount, setVisibleCount] = useState(15);

  // Load fresh beats from beatService (including user custom beats) & favorites from localStorage
  useEffect(() => {
    try {
      const allBeats = beatService.getAllDiscoveryBeats();
      const savedFavs = localStorage.getItem("bnp_favorites");
      const favIds: string[] = savedFavs ? JSON.parse(savedFavs) : [];
      setBeats(
        allBeats.map((b) => ({
          ...b,
          isFavorite: favIds.includes(b.id),
        }))
      );
    } catch {
      setBeats(beatService.getAllDiscoveryBeats());
    }
  }, []);

  // Reset pagination when search or filters change
  useEffect(() => {
    setVisibleCount(15);
  }, [searchQuery, selectedGenre, selectedSaleFilter, showOnlyFavorites, sortBy]);

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

  const handleTagClick = (genre: string) => {
    if (selectedGenre === genre) {
      setSelectedGenre("all");
    } else {
      setSelectedGenre(genre);
    }
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

        const matchesGenre =
          selectedGenre === "all" ||
          genres.includes(selectedGenre) ||
          tags.includes(selectedGenre);

        const matchesSale =
          selectedSaleFilter === "all" ||
          (selectedSaleFilter === "for_sale" && beat.priceTag !== "Not For Sale") ||
          (selectedSaleFilter === "not_for_sale" && beat.priceTag === "Not For Sale");

        const matchesFav = !showOnlyFavorites || beat.isFavorite;

        return matchesQuery && matchesGenre && matchesSale && matchesFav;
      })
      .sort((a, b) => {
        if (sortBy === "recent") {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        }
        if (sortBy === "rating") return (b.flames || 0) - (a.flames || 0);
        if (sortBy === "bpm") return (a.bpm || 0) - (b.bpm || 0);
        if (sortBy === "title") return (a.title || "").localeCompare(b.title || "");
        return 0;
      });
  }, [beats, searchQuery, selectedGenre, selectedSaleFilter, showOnlyFavorites, sortBy]);

  const activeFiltersCount =
    (selectedGenre !== "all" ? 1 : 0) +
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

  return (
    <div className="space-y-4 w-full animate-in fade-in duration-300">
      
      {/* Intro Description Box */}
      <div className="text-sm sm:text-base text-[#A0A0A0] leading-relaxed space-y-1.5 font-normal w-full">
        <p>
          This library showcases beats entered in Beats & Pieces battles throughout the years, as well as original tracks uploaded directly by community producers.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          
          {/* Search Bar */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by title, producer, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#181818] rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-[#666666] focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
            />
            <Search className="w-4 h-4 text-[#666666] absolute left-4 top-1/2 -translate-y-1/2" />
          </div>

          {/* Quick Action Controls Row (Favorites, Filter Drawer Toggle, Sort) */}
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
            {/* Favorites Filter Button */}
            <button
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
                showOnlyFavorites
                  ? "bg-amber-500/20 text-amber-300 shadow-sm"
                  : "bg-[#181818] text-[#888888] hover:text-white"
              }`}
            >
              <Star className={`w-4 h-4 ${showOnlyFavorites ? "fill-amber-400 text-amber-400" : ""}`} />
              <span>Favorites</span>
            </button>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
                showFilters || activeFiltersCount > 0
                  ? "bg-[#7B61FF] text-white"
                  : "bg-[#181818] text-[#888888] hover:text-white"
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filter</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-white text-[#7B61FF] text-xs font-bold flex items-center justify-center ml-0.5">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center bg-[#181818] rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-[#888888] shrink-0">
              <ArrowUpDown className="w-4 h-4 mr-2 text-[#666666] shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-white font-semibold text-xs sm:text-sm focus:outline-none cursor-pointer pr-1 leading-none"
              >
                <option value="recent" className="bg-[#181818] text-white">Most Recent</option>
                <option value="rating" className="bg-[#181818] text-white">Highest Rated</option>
                <option value="bpm" className="bg-[#181818] text-white">BPM (Low to High)</option>
                <option value="title" className="bg-[#181818] text-white">Title (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Expandable Filter Drawer */}
        {showFilters && (
          <div className="bg-[#181818] rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#888888] uppercase tracking-wider">
                Filter Catalogue
              </span>
              <button
                onClick={() => {
                  setSelectedGenre("all");
                  setSelectedSaleFilter("all");
                  setShowOnlyFavorites(false);
                }}
                className="text-xs text-[#7B61FF] hover:underline font-semibold"
              >
                Reset Filters
              </button>
            </div>

            {/* Genre Filters */}
            <div className="space-y-2">
              <span className="text-xs text-[#A0A0A0] block">Genre / Style</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedGenre("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedGenre === "all"
                      ? "bg-[#7B61FF] text-white"
                      : "bg-[#121212] text-[#888888] hover:text-white"
                  }`}
                >
                  All Genres
                </button>
                {allGenres.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => setSelectedGenre(genre)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedGenre === genre
                        ? "bg-[#7B61FF] text-white"
                        : "bg-[#121212] text-[#888888] hover:text-white"
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Tag / Availability Filters */}
            <div className="space-y-2 pt-2 border-t border-[#222222]">
              <span className="text-xs text-[#A0A0A0] block">Licensing / Price Status</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedSaleFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedSaleFilter === "all"
                      ? "bg-[#7B61FF] text-white"
                      : "bg-[#121212] text-[#888888] hover:text-white"
                  }`}
                >
                  All Beats
                </button>
                <button
                  onClick={() => setSelectedSaleFilter("for_sale")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedSaleFilter === "for_sale"
                      ? "bg-[#7B61FF] text-white"
                      : "bg-[#121212] text-[#888888] hover:text-white"
                  }`}
                >
                  Available For Sale / License
                </button>
                <button
                  onClick={() => setSelectedSaleFilter("not_for_sale")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
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
          <div className="bg-[#181818] rounded-2xl p-12 text-center space-y-3">
            <p className="text-white font-semibold">No beats match your search criteria.</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedGenre("all");
                setSelectedSaleFilter("all");
                setShowOnlyFavorites(false);
              }}
              className="text-xs text-[#7B61FF] hover:underline font-semibold"
            >
              Clear filters and search
            </button>
          </div>
        ) : (
          visibleBeats.map((beat) => (
            <div
              key={beat.id}
              className="bg-[#181818] rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-md"
            >
              {/* Row 1: Header (Title, Producer, Avatar, BPM, License Pill, Favorite) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                
                {/* Left: Beat Title + Producer Avatar/Tag */}
                {(() => {
                  const prod = producerService.getProducerById(beat.beatmaker.id) || producerService.getProducerByTag(beat.beatmaker.tag);
                  const displayTag = prod?.nickname || beat.beatmaker.tag;
                  const displayAvatar = prod?.avatarUrl || beat.beatmaker.avatarUrl || "/avatars/default-avatar.png";

                  return (
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <Link
                        href={`/producers/${beat.beatmaker.id}`}
                        className="w-10 h-10 rounded-full overflow-hidden relative shrink-0 hover:opacity-80 transition-opacity bg-[#121212]"
                      >
                        <Image
                          src={displayAvatar}
                          alt={displayTag}
                          fill
                          className="object-cover"
                        />
                      </Link>

                      <div className="min-w-0 flex-1 truncate">
                        {/* Title & Desktop Inline Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-white text-base sm:text-lg leading-snug">
                            {beat.title}
                          </h3>

                          {/* Desktop Inline Badges */}
                          <div className="hidden sm:inline-flex items-center gap-2">
                            {beat.rank === 1 && (
                              <span className="h-6 px-3 rounded-full bg-[#FF5E3A]/20 text-[#FF5E3A] text-xs font-bold inline-flex items-center justify-center leading-none">
                                1st Place
                              </span>
                            )}
                            {beat.rank === 2 && (
                              <span className="h-6 px-3 rounded-full bg-[#1E232A] text-[#94A3B8] text-xs font-bold inline-flex items-center justify-center leading-none">
                                2nd Place
                              </span>
                            )}
                            {beat.rank === 3 && (
                              <span className="h-6 px-3 rounded-full bg-[#FF5E3A]/10 text-[#FF8A65] text-xs font-bold inline-flex items-center justify-center leading-none">
                                3rd Place
                              </span>
                            )}

                            {(() => {
                              const match =
                                (beat.battleSource && beat.battleSource.match(/Beat Battle #?(\d+)/i)) ||
                                (beat.id && beat.id.match(/disc-bb(\d+)/));
                              if (!match) return null;
                              const battleUrl = `/battles/battle-${match[1]}`;
                              const battleLabel = `BB#${match[1]}`;
                              return (
                                <Link
                                  href={battleUrl}
                                  className="px-2 py-0.5 rounded-md bg-[#7B61FF]/15 text-[#A78BFA] hover:bg-[#7B61FF]/25 hover:text-white text-[11px] font-bold shrink-0 transition-all inline-flex items-center gap-1"
                                  title={`View ${beat.battleSource || `Beat Battle #${match[1]}`}`}
                                >
                                  <span>{battleLabel}</span>
                                  <span className="text-[9px]">↗</span>
                                </Link>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Mobile Badges Row (Under Title) */}
                        {(() => {
                          const match =
                            (beat.battleSource && beat.battleSource.match(/Beat Battle #?(\d+)/i)) ||
                            (beat.id && beat.id.match(/disc-bb(\d+)/));
                          const hasBadges = beat.rank || match;
                          if (!hasBadges) return null;

                          return (
                            <div className="flex sm:hidden items-center gap-2 pt-1 flex-wrap">
                              {beat.rank === 1 && (
                                <span className="h-6 px-2.5 rounded-full bg-[#FF5E3A]/20 text-[#FF5E3A] text-xs font-bold inline-flex items-center justify-center leading-none">
                                  1st Place
                                </span>
                              )}
                              {beat.rank === 2 && (
                                <span className="h-6 px-2.5 rounded-full bg-[#1E232A] text-[#94A3B8] text-xs font-bold inline-flex items-center justify-center leading-none">
                                  2nd Place
                                </span>
                              )}
                              {beat.rank === 3 && (
                                <span className="h-6 px-2.5 rounded-full bg-[#FF5E3A]/10 text-[#FF8A65] text-xs font-bold inline-flex items-center justify-center leading-none">
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
                          );
                        })()}

                        {/* Beatmaker name with clean padding below badges */}
                        <Link
                          href={`/producers/${beat.beatmaker.id}`}
                          className="text-xs sm:text-sm text-[#7B61FF] hover:underline font-semibold block truncate pt-1.5 sm:pt-0.5"
                        >
                          {displayTag}
                        </Link>
                      </div>
                    </div>
                  );
                })()}

                {/* Right: Meta Badges (BPM, Price, Flames, Fav) */}
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  
                  {/* BPM */}
                  {beat.bpm ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#121212] text-[#888888]">
                      {beat.bpm} BPM
                    </span>
                  ) : null}

                  {/* Price Tag Pill */}
                  {beat.priceTag ? (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
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
                    <div className="flex items-center gap-1 text-xs sm:text-sm text-[#7B61FF] font-bold px-2" title="Jury Score Average">
                      <Star className="w-4 h-4 fill-current text-[#7B61FF]" />
                      <span>{beat.juryScore.toFixed(2)}</span>
                    </div>
                  ) : null}

                  {/* Community Flames (Public Rating Avg) */}
                  {typeof beat.flames === "number" && beat.flames >= 1 ? (
                    <div className="flex items-center gap-1 text-xs sm:text-sm text-[#FF5E3A] font-bold px-2" title="Public Rating Average">
                      <Flame className="w-4 h-4 fill-current" />
                      <span>{beat.flames.toFixed(2)}</span>
                    </div>
                  ) : null}

                  {/* Favorite Button */}
                  <button
                    onClick={() => toggleFavorite(beat.id)}
                    className="p-2 rounded-xl bg-[#121212] hover:bg-[#222222] transition-colors text-[#888888] hover:text-amber-400 cursor-pointer"
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
                audioUrl={beat.audioUrl}
                duration={beat.duration}
                bpm={beat.bpm}
                compact={true}
              />

              {/* Row 3: Clickable Genre & Tags */}
              {((beat.genres && beat.genres.length > 0) || (beat.tags && beat.tags.length > 0)) ? (
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  {beat.genres?.map((g) => (
                    <button
                      key={g}
                      onClick={() => handleTagClick(g)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                        selectedGenre === g
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
                      onClick={() => handleTagClick(t)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        selectedGenre === t
                          ? "bg-[#7B61FF] text-white"
                          : "bg-[#121212] text-[#777777] hover:text-white hover:bg-[#202020]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              ) : null}

            </div>
          ))
        )}
      </div>

      {/* Load More Pagination Button */}
      {filteredBeats.length > visibleCount && (
        <div className="flex justify-center pt-6 pb-6">
          <button
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
