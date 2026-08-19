"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { sampleDiscoveryBeats, sampleProducers } from "@/lib/mock-data";
import { AudioWaveformPlayer } from "@/components/AudioWaveformPlayer";
import { DiscoveryBeat } from "@/lib/types";
import { Search, Filter, ArrowUpDown, Star, Flame, Mail, ExternalLink, Copy, CheckCircle2, ChevronDown } from "lucide-react";

export default function BeatsDiscoveryPage() {
  const [beats, setBeats] = useState<DiscoveryBeat[]>(sampleDiscoveryBeats);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [selectedSaleFilter, setSelectedSaleFilter] = useState<"all" | "for_sale" | "not_for_sale">("all");
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<"rating" | "bpm" | "title">("rating");
  const [showFilters, setShowFilters] = useState(false);

  // Pagination: 15 beats at a time
  const [visibleCount, setVisibleCount] = useState(15);

  // Contact Modal State
  const [contactProducerTag, setContactProducerTag] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Reset pagination when search or filters change
  useEffect(() => {
    setVisibleCount(15);
  }, [searchQuery, selectedGenre, selectedSaleFilter, showOnlyFavorites, sortBy]);

  // Load saved favorites from localStorage
  useEffect(() => {
    try {
      const savedFavs = localStorage.getItem("bnp_favorites");
      if (savedFavs) {
        const favIds: string[] = JSON.parse(savedFavs);
        setBeats((prev) =>
          prev.map((b) => ({
            ...b,
            isFavorite: favIds.includes(b.id),
          }))
        );
      }
    } catch {
      // ignore
    }
  }, []);

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
        const matchesQuery =
          beat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          beat.beatmaker.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
          beat.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesGenre =
          selectedGenre === "all" ||
          (beat.genres ? beat.genres.includes(selectedGenre) : false) ||
          beat.tags.includes(selectedGenre);

        const matchesSale =
          selectedSaleFilter === "all" ||
          (selectedSaleFilter === "for_sale" && beat.priceTag !== "Not For Sale") ||
          (selectedSaleFilter === "not_for_sale" && beat.priceTag === "Not For Sale");

        const matchesFav = !showOnlyFavorites || beat.isFavorite;

        return matchesQuery && matchesGenre && matchesSale && matchesFav;
      })
      .sort((a, b) => {
        if (sortBy === "rating") return (b.flames || 0) - (a.flames || 0);
        if (sortBy === "bpm") return a.bpm - b.bpm;
        if (sortBy === "title") return a.title.localeCompare(b.title);
        return 0;
      });
  }, [beats, searchQuery, selectedGenre, selectedSaleFilter, showOnlyFavorites, sortBy]);

  const activeFiltersCount =
    (selectedGenre !== "all" ? 1 : 0) +
    (selectedSaleFilter !== "all" ? 1 : 0);

  const selectedProducer = Object.values(sampleProducers).find(
    (p) => p.nickname.toLowerCase() === (contactProducerTag || "").toLowerCase()
  ) || sampleProducers["usr-ortega"];

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(selectedProducer.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const allGenres = Array.from(new Set(beats.flatMap((b) => b.genres || b.tags || [])));
  const visibleBeats = filteredBeats.slice(0, visibleCount);

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-300">
      
      {/* Intro Description Box */}
      <div className="text-sm sm:text-base text-[#A0A0A0] leading-relaxed space-y-1.5 font-normal max-w-4xl">
        <p>
          This library showcases beats entered in Beats & Pieces competitions throughout the years.
        </p>
        <p>
          To purchase licenses or collaborate, click any producer's nickname to view their showcase profile and direct contact channels.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          
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

          {/* Favorites Filter Button */}
          <button
            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
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
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              showFilters || activeFiltersCount > 0
                ? "bg-[#7B61FF] text-white"
                : "bg-[#181818] text-[#888888] hover:text-white"
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filter</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-white text-[#7B61FF] text-xs font-bold flex items-center justify-center ml-1">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Sort Dropdown */}
          <div className="flex items-center bg-[#181818] rounded-xl px-3 py-1.5 text-xs sm:text-sm text-[#888888]">
            <ArrowUpDown className="w-3.5 h-3.5 mr-2 text-[#666666]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer py-1.5 pr-2"
            >
              <option value="rating" className="bg-[#181818] text-white">Highest Rated</option>
              <option value="bpm" className="bg-[#181818] text-white">BPM (Low to High)</option>
              <option value="title" className="bg-[#181818] text-white">Title (A-Z)</option>
            </select>
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

            {/* Availability / Sale Status */}
            <div className="space-y-2 pt-2">
              <span className="text-xs text-[#A0A0A0] block">License Status</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all", label: "All Beats" },
                  { key: "for_sale", label: "Available for License / Sale" },
                  { key: "not_for_sale", label: "Showcase Only (Not For Sale)" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setSelectedSaleFilter(item.key as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedSaleFilter === item.key
                        ? "bg-[#7B61FF] text-white"
                        : "bg-[#121212] text-[#888888] hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Search Query Tag (if searching) */}
      {searchQuery && (
        <div className="text-xs text-[#7B61FF] px-1">
          Filtered by: &ldquo;{searchQuery}&rdquo;
        </div>
      )}

      {/* Beats List Container */}
      <div className="space-y-3">
        {filteredBeats.length === 0 ? (
          <div className="bg-[#181818] rounded-2xl p-12 text-center text-sm text-[#888888] space-y-2">
            <p className="text-white font-bold text-base">No beats found matching your criteria</p>
            <p className="text-xs text-[#666666]">Try clearing your search query or reset filters</p>
          </div>
        ) : (
          visibleBeats.map((beat) => (
            <div
              key={beat.id}
              className="bg-[#181818] rounded-2xl p-4 sm:p-5 space-y-3.5"
            >
              {/* Row 1: Header (Title, Producer, Avatar, BPM, License Pill, Favorite) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                
                {/* Left: Beat Title + Producer Avatar/Tag */}
                <div className="flex items-center gap-3.5 min-w-[240px]">
                  <Link
                    href={`/producers/${beat.beatmaker.id}`}
                    className="w-10 h-10 rounded-full overflow-hidden relative shrink-0 hover:opacity-80 transition-opacity bg-[#121212]"
                  >
                    <Image
                      src={beat.beatmaker.avatarUrl}
                      alt={beat.beatmaker.tag}
                      fill
                      className="object-cover"
                    />
                  </Link>

                  <div className="truncate">
                    <h3 className="font-bold text-white text-base sm:text-lg leading-snug truncate">
                      {beat.title}
                    </h3>
                    <Link
                      href={`/producers/${beat.beatmaker.id}`}
                      className="text-xs sm:text-sm text-[#7B61FF] hover:underline font-semibold block"
                    >
                      {beat.beatmaker.tag}
                    </Link>
                  </div>
                </div>

                {/* Right: Meta Badges (BPM, Price, Flames, Fav) */}
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  
                  {/* BPM */}
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#121212] text-[#888888]">
                    {beat.bpm} BPM
                  </span>

                  {/* Price Tag Pill */}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      beat.priceTag === "Not For Sale"
                        ? "bg-[#121212] text-[#666666]"
                        : "bg-[#FF5E3A]/20 text-[#FF5E3A]"
                    }`}
                  >
                    {beat.priceTag}
                  </span>

                  {/* Community Flames */}
                  <div className="flex items-center gap-1 text-xs sm:text-sm text-[#FF5E3A] font-bold px-2">
                    <Flame className="w-4 h-4 fill-current" />
                    <span>{beat.flames?.toFixed(2)}</span>
                  </div>

                  {/* Favorite Button */}
                  <button
                    onClick={() => toggleFavorite(beat.id)}
                    className="p-2 rounded-xl bg-[#121212] hover:bg-[#222222] transition-colors text-[#888888] hover:text-amber-400"
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

              {/* Row 3: Clickable Genre & Tags + Contact Producer Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs">
                
                {/* Interactive Clickable Tags */}
                <div className="flex flex-wrap items-center gap-2">
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

                {/* Contact Producer Button */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => setContactProducerTag(beat.beatmaker.tag)}
                    className="px-3.5 py-1.5 rounded-full bg-[#121212] hover:bg-[#7B61FF] text-[#888888] hover:text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Contact</span>
                  </button>
                </div>
              </div>

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

      {/* CONTACT MODAL DIALOG */}
      {contactProducerTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#181818] rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Contact {selectedProducer.nickname}</h3>
              <button
                onClick={() => setContactProducerTag(null)}
                className="w-8 h-8 rounded-full bg-[#121212] text-[#888888] hover:text-white flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs sm:text-sm text-[#A0A0A0] leading-relaxed">
              Inquire about beat licenses, custom production, or collabs directly with {selectedProducer.nickname}:
            </p>

            {/* Email Box */}
            <div className="bg-[#121212] rounded-xl p-3.5 flex items-center justify-between gap-3">
              <div className="truncate">
                <span className="text-[10px] text-[#777777] uppercase block">Direct Email</span>
                <span className="text-xs sm:text-sm text-white select-all">{selectedProducer.email}</span>
              </div>

              <button
                onClick={handleCopyEmail}
                className="px-3.5 py-1.5 rounded-lg bg-[#252525] hover:bg-[#7B61FF] text-white text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                {copiedEmail ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Social Channels */}
            <div className="space-y-2.5 pt-1">
              <span className="text-xs text-[#888888] uppercase block">Producer Channels</span>
              <div className="grid grid-cols-2 gap-2.5">
                {selectedProducer.links?.instagram && (
                  <a
                    href={selectedProducer.links.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-[#121212] hover:bg-[#1E1E1E] text-xs font-semibold text-white flex items-center justify-between transition-colors"
                  >
                    <span>Instagram</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#666666]" />
                  </a>
                )}

                {selectedProducer.links?.beatstars && (
                  <a
                    href={selectedProducer.links.beatstars}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-[#121212] hover:bg-[#1E1E1E] text-xs font-semibold text-white flex items-center justify-between transition-colors"
                  >
                    <span>BeatStars</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#666666]" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Link
                href={`/producers/${selectedProducer.id}`}
                onClick={() => setContactProducerTag(null)}
                className="flex-1 py-3 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white text-xs sm:text-sm font-bold text-center transition-colors"
              >
                View Full Showcase Profile
              </Link>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
