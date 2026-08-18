"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { sampleDiscoveryBeats, sampleProducers } from "@/lib/mock-data";
import { AudioWaveformPlayer } from "@/components/AudioWaveformPlayer";
import { DiscoveryBeat } from "@/lib/types";
import { Search, Filter, ArrowUpDown, Star, Flame, X, Mail, ExternalLink, Copy, CheckCircle2 } from "lucide-react";

export default function BeatsDiscoveryPage() {
  const [beats, setBeats] = useState<DiscoveryBeat[]>(sampleDiscoveryBeats);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [selectedSaleFilter, setSelectedSaleFilter] = useState<"all" | "for_sale" | "not_for_sale">("all");
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<"rating" | "bpm" | "title">("rating");
  const [showFilters, setShowFilters] = useState(false);

  // Contact Modal State
  const [contactProducerTag, setContactProducerTag] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

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
          beat.genres.includes(selectedGenre) ||
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
    (selectedSaleFilter !== "all" ? 1 : 0) +
    (showOnlyFavorites ? 1 : 0);

  const selectedProducer = Object.values(sampleProducers).find(
    (p) => p.nickname.toLowerCase() === (contactProducerTag || "").toLowerCase()
  ) || sampleProducers["usr-ortega"];

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(selectedProducer.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-300">
      
      {/* Intro Description Box */}
      <div className="text-sm sm:text-base text-[#A0A0A0] leading-relaxed space-y-2 font-normal max-w-4xl">
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
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold transition-all ${
              showOnlyFavorites
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-[#181818] text-[#888888] hover:text-white"
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${showOnlyFavorites ? "fill-amber-400 text-amber-400" : ""}`} />
            <span>Favorites</span>
          </button>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-semibold transition-all ${
              showFilters || activeFiltersCount > 0
                ? "bg-[#7B61FF] text-white"
                : "bg-[#181818] text-[#D1D1D1] hover:text-white"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ""}</span>
          </button>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 bg-[#181818] px-4 py-1.5 rounded-xl">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#888888]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "rating" | "bpm" | "title")}
              className="bg-transparent text-xs font-medium text-[#D1D1D1] focus:outline-none cursor-pointer py-1.5"
            >
              <option value="rating" className="bg-[#181818]">Sort: Rating</option>
              <option value="bpm" className="bg-[#181818]">Sort: BPM</option>
              <option value="title" className="bg-[#181818]">Sort: Title</option>
            </select>
          </div>

        </div>

        {/* Active Filter Pills Bar */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <span className="text-xs text-[#888888]">Active:</span>
            {selectedGenre !== "all" && (
              <button
                onClick={() => setSelectedGenre("all")}
                className="px-3 py-1 rounded-full bg-[#7B61FF] text-white text-xs font-medium flex items-center gap-1.5 hover:bg-[#684DE6] transition-colors"
              >
                <span>{selectedGenre}</span>
                <X className="w-3 h-3" />
              </button>
            )}
            {selectedSaleFilter !== "all" && (
              <button
                onClick={() => setSelectedSaleFilter("all")}
                className="px-3 py-1 rounded-full bg-[#7B61FF] text-white text-xs font-medium flex items-center gap-1.5 hover:bg-[#684DE6] transition-colors"
              >
                <span>{selectedSaleFilter === "for_sale" ? "For Sale" : "Not For Sale"}</span>
                <X className="w-3 h-3" />
              </button>
            )}
            {showOnlyFavorites && (
              <button
                onClick={() => setShowOnlyFavorites(false)}
                className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <span>⭐ Favorites Only</span>
                <X className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={() => {
                setSelectedGenre("all");
                setSelectedSaleFilter("all");
                setShowOnlyFavorites(false);
              }}
              className="text-xs text-[#888888] hover:text-white underline ml-2"
            >
              Reset all
            </button>
          </div>
        )}

        {/* Filter Drawer */}
        {showFilters && (
          <div className="bg-[#181818] rounded-xl p-5 space-y-4 animate-in fade-in duration-150">
            <div>
              <span className="text-xs font-mono text-[#888888] font-bold uppercase tracking-wider block mb-2">
                Genre / Style
              </span>
              <div className="flex flex-wrap gap-2">
                {["all", "Boom Bap", "Soul", "Lo-Fi", "Grimy"].map((genre) => (
                  <button
                    key={genre}
                    onClick={() => setSelectedGenre(genre)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedGenre === genre
                        ? "bg-[#7B61FF] text-white"
                        : "bg-[#121212] text-[#888888] hover:text-white"
                    }`}
                  >
                    {genre === "all" ? "All Genres" : genre}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-mono text-[#888888] font-bold uppercase tracking-wider block mb-2">
                Licensing Status
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "all", label: "All Beats" },
                  { id: "for_sale", label: "For Sale" },
                  { id: "not_for_sale", label: "Not For Sale" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedSaleFilter(opt.id as "all" | "for_sale" | "not_for_sale")}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedSaleFilter === opt.id
                        ? "bg-[#7B61FF] text-white"
                        : "bg-[#121212] text-[#888888] hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Beats List Cards */}
      <div className="space-y-3.5 pt-2">
        {filteredBeats.map((beat) => (
          <div
            key={beat.id}
            className="bg-[#181818] rounded-2xl p-5 space-y-3.5 hover:bg-[#1C1C1C] transition-all shadow-sm"
          >
            {/* Top row */}
            <div className="flex items-center justify-between gap-6">
              
              {/* Avatar + Title & Clickable Producer Link */}
              <div className="flex items-center gap-4 min-w-[240px]">
                <Link
                  href={`/producers/${beat.beatmaker.id}`}
                  className="w-14 h-14 rounded-xl overflow-hidden relative shrink-0 bg-[#121212] hover:opacity-80 transition-opacity"
                >
                  <Image
                    src={beat.beatmaker.avatarUrl}
                    alt={beat.beatmaker.tag}
                    fill
                    className="object-cover"
                  />
                </Link>

                <div className="flex flex-col">
                  <span className="text-xs text-[#888888] leading-tight line-clamp-1">{beat.title}</span>
                  <Link
                    href={`/producers/${beat.beatmaker.id}`}
                    className="text-lg font-bold text-white hover:text-[#7B61FF] transition-colors leading-snug"
                  >
                    {beat.beatmaker.tag}
                  </Link>
                </div>
              </div>

              {/* Waveform Scrubber with real Audio URL & Peaks */}
              <div className="flex-1 hidden sm:block">
                <AudioWaveformPlayer
                  id={`disc-${beat.id}`}
                  title={beat.title}
                  audioUrl={beat.audioUrl}
                  duration={beat.duration}
                  bpm={beat.bpm}
                  compact={true}
                />
              </div>

              {/* Flame Rating & Star Favorite */}
              <div className="flex items-center gap-5 shrink-0">
                <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-[#FF5E3A]">
                  <Flame className="w-4 h-4 fill-current" />
                  <span>{beat.flames ? beat.flames.toFixed(2) : "N/A"}</span>
                </div>

                <button
                  onClick={() => toggleFavorite(beat.id)}
                  className="p-1 text-zinc-600 hover:text-amber-400 transition-colors"
                  title={beat.isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  <Star
                    className={`w-4 h-4 ${
                      beat.isFavorite
                        ? "text-amber-400 fill-amber-400"
                        : "fill-transparent"
                    }`}
                  />
                </button>
              </div>

            </div>

            {/* Mobile Waveform */}
            <div className="sm:hidden">
              <AudioWaveformPlayer
                id={`disc-mob-${beat.id}`}
                title={beat.title}
                audioUrl={beat.audioUrl}
                duration={beat.duration}
                bpm={beat.bpm}
                compact={true}
              />
            </div>

            {/* Bottom Row Badges & Licensing Tag */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                {/* BPM Pill */}
                <span className="px-3 py-1 rounded-full bg-[#121212] text-[#888888] font-mono">
                  {beat.bpm} BPM
                </span>

                {/* Genre Pills */}
                {beat.genres.map((g) => {
                  const isSelected = selectedGenre === g;
                  return (
                    <button
                      key={g}
                      onClick={() => handleTagClick(g)}
                      className={`px-3 py-1 rounded-full font-medium transition-all ${
                        isSelected
                          ? "bg-[#7B61FF] text-white shadow-sm"
                          : "bg-[#121212] text-[#888888] hover:text-white hover:bg-[#1E1E1E]"
                      }`}
                    >
                      {g}
                    </button>
                  );
                })}

                {/* Additional Tags */}
                {beat.tags.map((t) => {
                  const isSelected = selectedGenre === t;
                  const isWinner = t.includes("Winner");
                  return (
                    <button
                      key={t}
                      onClick={() => handleTagClick(t)}
                      className={`px-3 py-1 rounded-full transition-all ${
                        isSelected
                          ? "bg-[#7B61FF] text-white shadow-sm"
                          : isWinner
                          ? "bg-[#251E14] text-[#E5A93C]"
                          : "bg-[#121212] text-[#888888] hover:text-white hover:bg-[#1E1E1E]"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>

              {/* Licensing Tag & Direct Inquire Action */}
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono font-medium ${
                    beat.priceTag === "For Sale"
                      ? "bg-emerald-950/40 text-emerald-400"
                      : "bg-[#121212] text-[#666666]"
                  }`}
                >
                  {beat.priceTag === "For Sale" ? "For Sale" : "Not For Sale"}
                </span>

                <button
                  onClick={() => setContactProducerTag(beat.beatmaker.tag)}
                  className="px-3 py-1 rounded-full bg-[#121212] hover:bg-[#7B61FF] text-[#888888] hover:text-white text-xs transition-colors flex items-center gap-1.5"
                >
                  <Mail className="w-3 h-3" />
                  <span>Contact</span>
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>

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

            <p className="text-xs text-[#A0A0A0] leading-relaxed">
              Inquire about beat licenses, custom production, or collabs directly with {selectedProducer.nickname}:
            </p>

            {/* Email Box */}
            <div className="bg-[#121212] rounded-xl p-3.5 flex items-center justify-between gap-3">
              <div className="truncate">
                <span className="text-[10px] font-mono text-[#777777] uppercase block">Direct Email</span>
                <span className="text-xs font-mono text-white select-all">{selectedProducer.email}</span>
              </div>

              <button
                onClick={handleCopyEmail}
                className="px-3.5 py-1.5 rounded-lg bg-[#252525] hover:bg-[#7B61FF] text-white text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5"
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
              <span className="text-xs font-mono text-[#888888] uppercase block">Producer Channels</span>
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
                className="flex-1 py-3 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white text-xs font-bold text-center transition-colors"
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
