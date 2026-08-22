"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { sampleProducers, sampleDiscoveryBeats, sampleSubmissions } from "@/lib/mock-data";
import { 
  AudioWaveformPlayer,
  extractRealAudioBufferWaveform,
  globalWaveformCache,
  WaveformData,
} from "@/components/AudioWaveformPlayer";
import { DiscoveryBeat, JudgeFeedbackItem, UserProfile, STANDARD_BEAT_TAGS } from "@/lib/types";
import { producerService, battleService, beatService, storageService } from "@/services";
import { normalizeUrl } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { 
  Flame, Trophy, Mail, ExternalLink, 
  CheckCircle2, Copy, MapPin, Calendar, Star, Award, Globe,
  Pencil, Plus, Lock, Trash2, AlertTriangle, Music, Sliders, X
} from "lucide-react";

/**
 * Standard Preset Tag Selector Component from platform tag pool
 */
function StandardTagSelector({
  selectedTags,
  onChange,
}: {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const filteredOptions = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return STANDARD_BEAT_TAGS;
    return STANDARD_BEAT_TAGS.filter((t) => t.toLowerCase().includes(q));
  }, [search]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((t) => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="space-y-2 relative">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[#D1D1D1]">Genres & Tags</label>
        {selectedTags.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[11px] text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Selected Tags Pill Box */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-1">
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#7B61FF]/15 text-xs text-[#A78BFA] font-medium"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => toggleTag(tag)}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer text-xs"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search Input Box with Focus Dropdown */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onFocus={() => setIsDropdownOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsDropdownOpen(true);
          }}
          placeholder={selectedTags.length === 0 ? "Search or select tags (e.g. Trap, Lo-Fi, Soulful)..." : "Add more tags from list..."}
          className="w-full bg-[#121212] rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown Options List */}
      {isDropdownOpen && (
        <div className="p-2.5 bg-[#141414] rounded-xl max-h-48 overflow-y-auto space-y-1.5 shadow-2xl z-20">
          <div className="flex flex-wrap gap-1.5">
            {filteredOptions.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-[#7B61FF] text-white shadow-sm"
                      : "bg-[#1f1f1f] text-zinc-300 hover:bg-[#2a2a2a] hover:text-white"
                  }`}
                >
                  <span>{tag}</span>
                  {isSelected ? <span>✓</span> : <span className="text-zinc-500 text-[10px]">+</span>}
                </button>
              );
            })}
            {filteredOptions.length === 0 && (
              <p className="text-xs text-zinc-500 py-2 px-1">No matching tags found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 5-Second Auto-Cycling Judge Feedback Component
 */
function JudgeFeedbackTicker({
  feedbacks,
}: {
  feedbacks: JudgeFeedbackItem[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!feedbacks || feedbacks.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % feedbacks.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [feedbacks]);

  if (!feedbacks || feedbacks.length === 0) return null;

  const current = feedbacks[currentIndex] || feedbacks[0];

  return (
    <div className="pt-2.5 mt-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex-1 flex items-baseline gap-2 min-w-0 transition-all duration-300">
          <span className="font-semibold text-[#7B61FF] shrink-0">
            {current.judgeName}:
          </span>
          <span className="text-[#C4C4C4] italic truncate sm:whitespace-normal">
            &ldquo;{current.feedback}&rdquo;
          </span>
        </div>

        {feedbacks.length > 1 && (
          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
            {feedbacks.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  i === currentIndex
                    ? "bg-[#7B61FF] scale-125"
                    : "bg-[#444444] hover:bg-[#666666]"
                }`}
                title={`Feedback from ${feedbacks[i].judgeName}`}
              />
            ))}
            <span className="text-[10px] text-[#666666] ml-1">
              {currentIndex + 1}/{feedbacks.length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Brand SVG Icons for Social Links
const SocialIcons: Record<string, React.FC<{ className?: string }>> = {
  instagram: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  ),
  youtube: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  spotify: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.485 17.306c-.215.352-.676.463-1.028.248-2.857-1.745-6.453-2.14-10.686-1.173-.404.093-.807-.16-.9-.564-.092-.404.161-.807.564-.9 4.63-1.057 8.604-.615 11.802 1.359.352.215.463.676.248 1.028zm1.464-3.26c-.27.441-.849.58-1.29.31-3.27-2.01-8.254-2.593-12.122-1.417-.497.151-1.024-.132-1.175-.629-.151-.497.132-1.024.629-1.175 4.417-1.341 9.907-.692 13.648 1.621.441.27.58.849.31 1.29zm.126-3.41c-3.921-2.328-10.383-2.543-14.122-1.407-.601.183-1.242-.163-1.425-.764-.183-.601.163-1.242.764-1.425 4.301-1.306 11.428-1.054 15.93 1.62.54.32.715 1.02.395 1.56-.32.54-1.02.715-1.56.395z"/>
    </svg>
  ),
  bandcamp: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 18.75l7.437-13.5H24l-7.438 13.5H0z"/>
    </svg>
  ),
  soundcloud: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M1.175 12.225c-.051 0-.094.045-.102.1l-.269 2.89c-.004.053.037.1.09.102l.279.012c.053 0 .096-.045.102-.098l.273-2.906c.004-.051-.037-.098-.09-.1zm1.229-.877c-.057 0-.106.047-.114.106l-.371 3.82c-.004.057.037.108.096.11l.383.014c.057 0 .106-.047.114-.106l.371-3.834c.004-.055-.039-.104-.096-.108zm1.229-.449c-.061 0-.114.049-.12.112l-.465 4.316c-.006.061.039.114.102.118l.478.014c.061 0 .114-.049.12-.112l.465-4.336c.006-.059-.039-.11-.102-.112zm1.234-.309c-.065 0-.12.051-.128.118l-.553 4.674c-.006.065.041.122.108.124l.567.014c.065 0 .12-.051.128-.118l.553-4.688c.006-.065-.043-.12-.108-.124zm1.23-.391c-.069 0-.128.055-.134.124l-.629 5.129c-.008.069.043.128.114.132l.635.016c.069 0 .128-.055.134-.124l.631-5.143c.008-.071-.045-.13-.114-.134zm1.232-.424c-.071 0-.134.059-.14.13l-.689 5.617c-.008.073.047.136.12.14l.707.016c.073 0 .134-.059.14-.132l.691-5.631c.008-.073-.047-.136-.12-.14zm1.232-.303c-.075 0-.14.063-.146.14l-.736 6.002c-.008.077.049.142.128.146l.764.016c.075 0 .14-.063.146-.14l.738-6.018c.008-.077-.049-.142-.128-.146zm1.232.063c-.077 0-.142.065-.15.146l-.754 5.922c-.008.079.051.146.132.15l.775.016c.077 0 .142-.065.15-.146l.756-5.938c.008-.079-.051-.146-.132-.15zm1.232-.619c-.079 0-.146.067-.154.15l-.764 6.584c-.008.081.053.15.136.154l.797.016c.081 0 .146-.067.154-.15l.764-6.6c.008-.083-.053-.15-.136-.154zm1.472-1.748c-.085 0-.156.071-.164.158l-.66 8.355c-.008.087.057.16.146.164l.871.016c.085 0 .156-.071.164-.158l.66-8.371c.008-.087-.057-.16-.146-.164zm4.845 2.115c-.443 0-.865.092-1.248.256-.134-.992-.988-1.754-2.025-1.754-.263 0-.512.051-.744.138-.081.031-.136.108-.134.196l.465 7.643c.006.096.085.172.181.172h6.816c1.884 0 3.411-1.527 3.411-3.411s-1.527-3.24-3.411-3.24c-.461 0-.898.092-1.309.256-.569-1.372-1.928-2.34-3.513-2.34-.168 0-.334.012-.497.035-.098.014-.176.089-.181.189l-.229 2.069c.645-.224 1.341-.349 2.069-.349 2.037 0 3.844 1.132 4.793 2.809.11.193.345.281.551.205.343-.126.711-.197 1.096-.197 1.709 0 3.096 1.387 3.096 3.096s-1.387 3.096-3.096 3.096h-6.191l-.381-6.248c1.378-.457 2.378-1.758 2.378-3.297 0-.256-.029-.506-.083-.746z"/>
    </svg>
  ),
  beatstars: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </svg>
  ),
  facebook: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  website: ({ className }) => <Globe className={className} />,
};

export function ProducerProfileClient({ producerId }: { producerId: string }) {
  const { user: authUser } = useAuth();

  const [producer, setProducer] = useState<UserProfile>(() => {
    return producerService.getProducerById(producerId) || sampleProducers[producerId] || sampleProducers["nerub"] || Object.values(sampleProducers)[0];
  });

  useEffect(() => {
    const fresh = producerService.getProducerById(producerId);
    if (fresh) {
      setProducer(fresh);
    }
  }, [producerId]);

  const [copiedEmail, setCopiedEmail] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [beatsVersion, setBeatsVersion] = useState(0);

  // Edit Beat Modal state
  const [editingBeat, setEditingBeat] = useState<{
    id: string;
    title: string;
    audioUrl: string;
    bpm: number | "";
    isForSale: boolean;
    isBattleSubmission: boolean;
    battleSource?: string;
  } | null>(null);
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [editingTagInput, setEditingTagInput] = useState("");

  // Add Beat Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBeatTitle, setNewBeatTitle] = useState("");
  const [newBeatAudioUrl, setNewBeatAudioUrl] = useState("");
  const [newBeatAudioName, setNewBeatAudioName] = useState("");
  const [newBeatBpm, setNewBeatBpm] = useState<number | "">("");
  const [newBeatIsForSale, setNewBeatIsForSale] = useState(false);
  const [newBeatTags, setNewBeatTags] = useState<string[]>([]);
  const [newBeatTagInput, setNewBeatTagInput] = useState("");
  const [newBeatDuration, setNewBeatDuration] = useState(120);
  const [newBeatWaveformPeaks, setNewBeatWaveformPeaks] = useState<number[]>([]);
  const [isUploadingBeatAudio, setIsUploadingBeatAudio] = useState(false);

  const [saveToastMessage, setSaveToastMessage] = useState<string | null>(null);

  const backdropMouseDownRef = useRef<EventTarget | null>(null);

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    backdropMouseDownRef.current = e.target;
  };

  const handleBackdropMouseUp = (e: React.MouseEvent, closeCallback: () => void) => {
    if (e.target === e.currentTarget && backdropMouseDownRef.current === e.currentTarget) {
      closeCallback();
    }
    backdropMouseDownRef.current = null;
  };

  const showToast = (msg: string) => {
    setSaveToastMessage(msg);
    setTimeout(() => setSaveToastMessage(null), 3000);
  };

  const addEditingTags = (input: string) => {
    const rawTokens = input.split(",").map((t) => t.trim()).filter(Boolean);
    if (rawTokens.length === 0) {
      setEditingTagInput("");
      return;
    }
    setEditingTags((prev) => {
      const next = [...prev];
      rawTokens.forEach((token) => {
        if (!next.includes(token)) next.push(token);
      });
      return next;
    });
    setEditingTagInput("");
  };

  const addNewBeatTags = (input: string) => {
    const rawTokens = input.split(",").map((t) => t.trim()).filter(Boolean);
    if (rawTokens.length === 0) {
      setNewBeatTagInput("");
      return;
    }
    setNewBeatTags((prev) => {
      const next = [...prev];
      rawTokens.forEach((token) => {
        if (!next.includes(token)) next.push(token);
      });
      return next;
    });
    setNewBeatTagInput("");
  };

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowContactModal(false);
        setEditingBeat(null);
        setIsAddModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Check if active user is the owner of this profile (strictly owner only)
  const isProfileOwner = Boolean(
    authUser && (
      authUser.id === producer.id ||
      (authUser.nickname && authUser.nickname.toLowerCase() === producer.nickname.toLowerCase())
    )
  );

  // Merge and prioritize all beats for this producer dynamically from beatService
  const prioritizedBeats = useMemo(() => {
    const allBeats = beatService.getAllDiscoveryBeats();
    const baseBeats = allBeats.filter(
      (b) =>
        b.beatmaker.id === producer.id ||
        b.beatmaker.tag.toLowerCase() === producer.nickname.toLowerCase()
    );

    const submissions = sampleSubmissions.filter(
      (s) =>
        s.userId === producer.id ||
        s.beatmakerTag.toLowerCase() === producer.nickname.toLowerCase()
    );

    const mergedList: (DiscoveryBeat & {
      tier: number;
      rank?: number;
      juryScore?: number;
      competitionTitle?: string;
      juryFeedbacksList?: JudgeFeedbackItem[];
    })[] = [];

    baseBeats.forEach((b) => {
      let tier = 4;
      let rank = b.rank;

      if (b.battleSource) {
        if (b.battleSource.includes("1st Place") || rank === 1) tier = 1;
        else if (b.battleSource.includes("2nd Place") || rank === 2) tier = 2;
        else if (b.battleSource.includes("3rd Place") || rank === 3) tier = 3;
        else tier = 3;
      }

      mergedList.push({
        ...b,
        tier,
        rank,
        competitionTitle: b.battleSource,
      });
    });

    submissions.forEach((sub) => {
      // Check if battle still exists (has not been deleted)
      const battle = battleService.getBattleById(sub.battleId);
      if (!battle) return;

      const existing = mergedList.find(
        (b) => b.audioUrl === sub.audioUrl || (b.title === sub.beatTitle && sub.beatTitle !== "Beat Battle #1")
      );

      const juryList: JudgeFeedbackItem[] = (sub.juryFeedbacks || []).filter(
        (f) => f.feedback && f.feedback.trim().length > 0
      );
      if (sub.juryFeedback && sub.judgeName && juryList.length === 0 && sub.juryFeedback.trim().length > 0) {
        juryList.push({
          judgeName: sub.judgeName,
          feedback: sub.juryFeedback.trim(),
        });
      }

      if (existing) {
        if (juryList.length > 0) {
          existing.juryFeedbacksList = juryList;
        }
      } else {
        const flameVal = typeof sub.flameRating === "number" && !isNaN(sub.flameRating)
          ? Math.min(5.0, Math.max(0, sub.flameRating))
          : (typeof sub.juryScore === "number" && !isNaN(sub.juryScore) ? Math.min(5.0, Math.max(0, sub.juryScore)) : 0);

        mergedList.push({
          id: `sub-${sub.id}`,
          title: sub.beatTitle,
          beatmaker: {
            id: sub.userId,
            tag: sub.beatmakerTag,
            avatarUrl: producer.avatarUrl || "/avatars/default-avatar.png",
          },
          audioUrl: sub.audioUrl,
          waveform: sub.waveform,
          duration: sub.duration || 120,
          bpm: typeof sub.bpm === "number" ? sub.bpm : undefined,
          priceTag: "Not For Sale",
          tags: [],
          flames: flameVal,
          tier: sub.rank === 1 ? 1 : sub.rank === 2 ? 2 : sub.rank === 3 ? 3 : 4,
          rank: sub.rank,
          juryScore: sub.juryScore,
          competitionTitle: battle.title || `Beat Battle #${sub.battleId ? sub.battleId.replace('battle-', '') : '8'}`,
          juryFeedbacksList: juryList,
          createdAt: sub.submittedAt,
        });
      }
    });

    return mergedList.sort((a, b) => {
      if (a.tier !== b.tier) {
        return a.tier - b.tier;
      }
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (dateA !== dateB) {
        return dateB - dateA;
      }
      return (b.flames || 0) - (a.flames || 0);
    });
  }, [producer, beatsVersion]);

  const MAX_FREE_BEATS = 3;
  const customUploadedBeats = prioritizedBeats.filter(
    (b) =>
      !b.battleSource &&
      !b.competitionTitle &&
      !b.rank &&
      !(b.id && (b.id.startsWith("sub-") || b.id.startsWith("disc-bb")))
  );
  const isAtBeatLimit = customUploadedBeats.length >= MAX_FREE_BEATS;

  // Compute prioritized badges: Admin -> Host -> Battle Champion -> OG Producer / Community
  const sortedBadges = useMemo(() => {
    const rawRoles = new Set<string>(
      (producer.discordRoles || []).filter(
        (r) =>
          !r.toLowerCase().startsWith("winner bb") &&
          !r.toLowerCase().startsWith("winner #") &&
          r.toLowerCase() !== "judge" &&
          r.toLowerCase() !== "jury"
      )
    );

    // 1. Automatic Battle Champion: Check if producer has won any battle (1st place) or has battlesWon > 0
    const hasWonAnyBattle =
      (producer.stats?.battlesWon && producer.stats.battlesWon > 0) ||
      prioritizedBeats.some((b) => b.rank === 1);
    if (hasWonAnyBattle) {
      rawRoles.add("Battle Champion");
    }

    // 2. Inject system roles if applicable (Admin & Host)
    if (producer.role === "admin" || producer.email === "adrian.hrihor@gmail.com" || producer.nickname.toLowerCase() === "nerub") {
      rawRoles.add("Admin");
    }
    if (producer.role === "host" || (producer.email && battleService.getBattlesByHost(producer.email).length > 0)) {
      rawRoles.add("Host");
    }

    const roleRank = (roleName: string): number => {
      const lower = roleName.toLowerCase();
      if (lower === "admin") return 1;
      if (lower === "host") return 2;
      if (lower.includes("champion") || lower.includes("winner") || lower.includes("1st")) return 3;
      if (lower.includes("og producer") || lower.includes("og")) return 4;
      return 5;
    };

    return Array.from(rawRoles).sort((a, b) => roleRank(a) - roleRank(b));
  }, [producer, prioritizedBeats]);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(producer.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleOpenEditModal = (beat: any) => {
    const isBattle = Boolean(
      beat.battleSource ||
      beat.rank ||
      beat.competitionTitle ||
      (beat.id && (beat.id.startsWith("sub-") || beat.id.startsWith("disc-bb")))
    );

    const isForSale = Boolean(beat.priceTag && beat.priceTag !== "Not For Sale");
    const rawTags: string[] = Array.from(new Set([...(beat.tags || [])]));

    setEditingBeat({
      id: beat.id,
      title: beat.title,
      audioUrl: beat.audioUrl,
      bpm: typeof beat.bpm === "number" && !isNaN(beat.bpm) ? beat.bpm : "",
      isForSale: isForSale,
      isBattleSubmission: isBattle,
      battleSource: beat.battleSource || beat.competitionTitle,
    });
    setEditingTags(rawTags.filter(Boolean));
    setEditingTagInput("");
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>, isNew: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBeatAudio(true);
    try {
      // 1. Instantly decode arrayBuffer in memory for exact waveform & duration
      let extractedWaveform: WaveformData | null = null;
      let realDuration = 120;
      try {
        const arrayBuf = await file.arrayBuffer();
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const decoded = await ctx.decodeAudioData(arrayBuf.slice(0));
          extractedWaveform = extractRealAudioBufferWaveform(decoded, 800);
          realDuration = Math.round(decoded.duration);
          ctx.close();
        }
      } catch (decodeErr) {
        console.warn("In-memory audio decode warning:", decodeErr);
      }

      // 2. Upload to Supabase Storage 'beats' folder
      const { url } = await storageService.uploadAudio(
        file,
        "beats",
        `${producer.id}-${Date.now()}`
      );

      const finalAudioUrl = url || URL.createObjectURL(file);
      if (extractedWaveform) {
        globalWaveformCache.set(finalAudioUrl, extractedWaveform);
      }

      if (isNew) {
        setNewBeatAudioUrl(finalAudioUrl);
        setNewBeatAudioName(file.name);
        setNewBeatDuration(realDuration);
        setNewBeatWaveformPeaks(extractedWaveform ? extractedWaveform.peaks : []);
      } else if (editingBeat && !editingBeat.isBattleSubmission) {
        setEditingBeat({
          ...editingBeat,
          audioUrl: finalAudioUrl,
        });
      }
    } catch (err) {
      console.error("Audio upload error:", err);
      alert("Failed to upload audio file. Please try again.");
    } finally {
      setIsUploadingBeatAudio(false);
    }
  };

  const handleSaveEditBeat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBeat) return;

    const priceTag = editingBeat.isForSale ? "For Sale" : "Not For Sale";
    const bpmValue = editingBeat.bpm !== "" && !isNaN(Number(editingBeat.bpm)) ? Number(editingBeat.bpm) : undefined;

    if (editingBeat.isBattleSubmission) {
      // Battle submissions: update BPM, priceTag, and tags only
      beatService.updateBeat(editingBeat.id, {
        bpm: bpmValue,
        priceTag: priceTag,
        tags: editingTags,
        genres: [],
      });
    } else {
      // Standalone beats: update title, audioUrl, bpm, priceTag, and tags
      beatService.updateBeat(editingBeat.id, {
        title: editingBeat.title.trim() || "Untitled Beat",
        audioUrl: editingBeat.audioUrl,
        bpm: bpmValue,
        priceTag: priceTag,
        tags: editingTags,
        genres: [],
      });
    }

    setEditingBeat(null);
    setBeatsVersion((v) => v + 1);
    showToast("Beat updated successfully!");
  };

  const handleDeleteBeat = (id: string) => {
    if (editingBeat?.isBattleSubmission) {
      alert("Battle submissions cannot be deleted as they are part of the battle archive.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this beat?")) {
      beatService.deleteBeat(id);
      setEditingBeat(null);
      setBeatsVersion((v) => v + 1);
      showToast("Beat deleted");
    }
  };

  const handleCreateBeat = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAtBeatLimit) {
      alert(`You have reached the maximum limit of ${MAX_FREE_BEATS} uploaded showcase beats.`);
      return;
    }
    if (!newBeatTitle.trim()) {
      alert("Please enter a beat title.");
      return;
    }
    if (!newBeatAudioUrl) {
      alert("Please select and upload an audio file.");
      return;
    }

    const bpmValue = newBeatBpm !== "" && !isNaN(Number(newBeatBpm)) ? Number(newBeatBpm) : undefined;

    beatService.createBeat({
      title: newBeatTitle.trim(),
      beatmaker: {
        id: producer.id,
        tag: producer.nickname,
        avatarUrl: producer.avatarUrl || "/avatars/default-avatar.png",
      },
      audioUrl: newBeatAudioUrl,
      duration: newBeatDuration,
      waveform: newBeatWaveformPeaks,
      bpm: bpmValue,
      priceTag: newBeatIsForSale ? "For Sale" : "Not For Sale",
      tags: newBeatTags,
      genres: [],
      createdAt: new Date().toISOString(),
    });

    setIsAddModalOpen(false);
    setNewBeatTitle("");
    setNewBeatAudioUrl("");
    setNewBeatAudioName("");
    setNewBeatBpm("");
    setNewBeatIsForSale(false);
    setNewBeatTags([]);
    setNewBeatTagInput("");
    setNewBeatWaveformPeaks([]);
    setBeatsVersion((v) => v + 1);
    showToast("Beat added to your showcase!");
  };

  const activeLinks = Object.entries(producer.links || {}).filter(([_, url]) => Boolean(url && url.trim()));

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      
      {/* SECTION 1: PRODUCER HERO / IDENTITY */}
      <div className="bg-[#181818] rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 sm:gap-8">
          
          {/* Avatar */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden relative shrink-0 bg-[#121212] shadow-inner">
            <Image
              src={producer.avatarUrl || "/avatars/default-avatar.png"}
              alt={producer.nickname}
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Producer Info & Bio */}
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {producer.nickname}
              </h1>

              {/* Sorted Priority Badges */}
              {sortedBadges.map((role) => {
                const lower = role.toLowerCase();
                let badgeClass = "bg-[#1E232A] text-[#94A3B8]";
                if (lower === "admin") {
                  badgeClass = "bg-brand text-white font-bold shadow-sm";
                } else if (lower === "host") {
                  badgeClass = "bg-[#FF8A65]/20 text-[#FF8A65] font-bold";
                } else if (lower.includes("champion") || lower.includes("winner") || lower.includes("1st")) {
                  badgeClass = "bg-[#FF5E3A]/20 text-[#FF5E3A] font-bold";
                }

                return (
                  <span
                    key={role}
                    className={`px-3 py-1 rounded-full text-xs ${badgeClass}`}
                  >
                    {role}
                  </span>
                );
              })}
            </div>

            {producer.bio ? (
              <p className="text-sm text-[#D1D1D1] leading-relaxed max-w-2xl font-normal">
                {producer.bio}
              </p>
            ) : null}

            {/* Location & Member Since */}
            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-[#888888]">
              {producer.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#7B61FF]" />
                  <span>{producer.location}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#888888]" />
                <span>Member since {new Date(producer.createdAt).getFullYear()}</span>
              </span>
            </div>

            {/* Clickable Social Icons */}
            {activeLinks.length > 0 && (
              <div className="flex flex-wrap items-center gap-3.5 pt-1">
                {activeLinks.map(([platform, url]) => {
                  const IconComponent = SocialIcons[platform.toLowerCase()] || SocialIcons.website;
                  const hoverColorClasses: Record<string, string> = {
                    instagram: "hover:text-[#E4405F]",
                    youtube: "hover:text-[#FF0000]",
                    spotify: "hover:text-[#1DB954]",
                    bandcamp: "hover:text-[#1DA0C3]",
                    soundcloud: "hover:text-[#FF5500]",
                    beatstars: "hover:text-[#FF3B30]",
                    facebook: "hover:text-[#1877F2]",
                    website: "hover:text-[#7B61FF]",
                  };
                  const hoverColor = hoverColorClasses[platform.toLowerCase()] || "hover:text-[#7B61FF]";
                  const formattedUrl = normalizeUrl(url);

                  return (
                    <a
                      key={platform}
                      href={formattedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-zinc-400 ${hoverColor} transition-colors duration-200 active:scale-95 inline-flex items-center justify-center`}
                      title={`${platform.charAt(0).toUpperCase() + platform.slice(1)}: ${url}`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Contact / Inquire Action Button */}
          <div className="flex flex-col gap-3 shrink-0 w-full md:w-auto self-start md:self-center">
            <button
              onClick={() => setShowContactModal(true)}
              className="px-7 py-3.5 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>Contact / License</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: PRODUCER BEATS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Beats</h2>
            {isProfileOwner && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#121212] text-zinc-400 font-medium">
                {customUploadedBeats.length}/{MAX_FREE_BEATS} Uploaded
              </span>
            )}
          </div>
          
          {isProfileOwner && (
            <button
              onClick={() => {
                if (isAtBeatLimit) {
                  alert(`You have reached the maximum limit of ${MAX_FREE_BEATS} uploaded showcase beats.`);
                  return;
                }
                setNewBeatTitle("");
                setNewBeatAudioUrl("");
                setNewBeatAudioName("");
                setNewBeatBpm("");
                setNewBeatIsForSale(false);
                setNewBeatTags([]);
                setIsAddModalOpen(true);
              }}
              disabled={isAtBeatLimit}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 ${
                isAtBeatLimit
                  ? "bg-[#222222] text-zinc-500 cursor-not-allowed"
                  : "bg-[#7B61FF] hover:bg-[#684DE6] text-white active:scale-95 cursor-pointer"
              }`}
              title={isAtBeatLimit ? `Limit of ${MAX_FREE_BEATS} beats reached` : "Add Beat"}
            >
              <Plus className="w-4 h-4" />
              <span>Add Beat {isAtBeatLimit ? `(${MAX_FREE_BEATS}/${MAX_FREE_BEATS})` : ""}</span>
            </button>
          )}
        </div>

        {/* Max Upload Limit Notice */}
        {isProfileOwner && isAtBeatLimit && (
          <div className="bg-[#1C1A24] rounded-2xl p-4 flex items-center gap-3.5 text-xs text-zinc-300 animate-in fade-in duration-200">
            <div className="w-8 h-8 rounded-xl bg-[#7B61FF]/15 flex items-center justify-center shrink-0 text-[#7B61FF]">
              <Music className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white">Maximum upload limit reached (3/3).</p>
              <p className="text-[#888888] mt-0.5">
                To upload a new beat, you can remove an existing one. Unlocking more slots will be possible in future versions of the platform.
              </p>
            </div>
          </div>
        )}

        {prioritizedBeats.length > 0 ? (
          <div className="space-y-3.5">
            {prioritizedBeats.map((beat) => (
              <div
                key={beat.id}
                className="bg-[#181818] rounded-2xl p-4 sm:p-5 space-y-3 shadow-md group relative"
              >
                {/* Row 1: Header (Title, Rank Badge, Meta, Edit Action) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* Left: Beat Title + Battle Source */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="font-bold text-white text-base sm:text-lg leading-snug truncate">
                          {beat.title}
                        </h3>

                        {/* Rank Badge */}
                        {beat.rank === 1 && (
                          <span className="h-6 px-3 rounded-full bg-[#FF5E3A]/20 text-[#FF5E3A] text-xs font-bold inline-flex items-center justify-center leading-none">
                            1st Place Winner
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
                      </div>

                      {beat.battleSource && (
                        <span className="text-xs text-[#888888] font-medium block mt-0.5">
                          {beat.battleSource}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: BPM, Price Tag, Flames, Edit Button */}
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    {beat.bpm ? (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#121212] text-[#888888]">
                        {beat.bpm} BPM
                      </span>
                    ) : null}

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

                    {/* Public Rating Avg */}
                    {typeof beat.flames === "number" && beat.flames > 0 ? (
                      <div className="flex items-center gap-1 text-xs sm:text-sm text-[#FF5E3A] font-bold px-2" title="Public Rating Average">
                        <Flame className="w-4 h-4 fill-current" />
                        <span>{beat.flames.toFixed(2)}</span>
                      </div>
                    ) : null}

                    {/* Edit Beat Button (Profile Owner only) */}
                    {isProfileOwner && (
                      <button
                        onClick={() => handleOpenEditModal(beat)}
                        className="p-2 rounded-xl bg-[#121212] hover:bg-[#222222] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        title="Edit beat details"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                </div>

                {/* Row 2: Full Waveform Player */}
                <AudioWaveformPlayer
                  id={`prod-beat-${beat.id}`}
                  title={beat.title}
                  audioUrl={beat.audioUrl}
                  duration={beat.duration}
                  bpm={beat.bpm}
                  compact={true}
                />

                {/* Row 3: Beat Tags */}
                {beat.tags && beat.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {beat.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 rounded-full bg-[#121212] text-[#888888] font-medium text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Row 4: Judge Feedback Loop / Ticker */}
                {beat.juryFeedbacksList && beat.juryFeedbacksList.length > 0 && (
                  <div className="bg-[#121212] rounded-xl px-4 py-2.5">
                    <JudgeFeedbackTicker feedbacks={beat.juryFeedbacksList} />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#181818] rounded-2xl p-8 text-center space-y-2">
            <p className="text-zinc-400 text-sm">
              No beats found for this producer yet.
            </p>
          </div>
        )}
      </div>

      {/* EDIT BEAT MODAL */}
      {editingBeat && (
        <div
          onMouseDown={handleBackdropMouseDown}
          onMouseUp={(e) => handleBackdropMouseUp(e, () => setEditingBeat(null))}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#181818] rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative cursor-default"
          >
            <div className="flex items-center justify-between pb-2">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-[#7B61FF]" />
                  <span>Edit Beat Details</span>
                </h3>
                {editingBeat.isBattleSubmission && (
                  <p className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>Battle Submission Archive</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => setEditingBeat(null)}
                className="w-8 h-8 rounded-full bg-[#121212] text-zinc-400 hover:text-white flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Battle submission limitation notice (only battle name in paranthesis) */}
            {editingBeat.isBattleSubmission && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-300 text-xs flex items-start gap-2.5 leading-relaxed">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  This beat is part of a historical battle archive ({((editingBeat.battleSource || "Beat Battle").replace(/\s*\([^)]*\)/g, "")).trim()}). The <strong>Beat Title</strong> and <strong>Audio Master</strong> cannot be changed or deleted to preserve competition records.
                </p>
              </div>
            )}

            <form onSubmit={handleSaveEditBeat} className="space-y-4">
              
              {/* Beat Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#D1D1D1] flex items-center justify-between">
                  <span>Beat Title</span>
                  {editingBeat.isBattleSubmission && (
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Locked
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  disabled={editingBeat.isBattleSubmission}
                  value={editingBeat.title}
                  onChange={(e) =>
                    setEditingBeat({ ...editingBeat, title: e.target.value })
                  }
                  className={`w-full bg-[#121212] rounded-xl px-4 py-3 text-xs text-white focus:outline-none ${
                    editingBeat.isBattleSubmission
                      ? "opacity-60 cursor-not-allowed"
                      : "focus:ring-1 focus:ring-[#7B61FF]"
                  }`}
                />
              </div>

              {/* Audio Replacement (Standalone only) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#D1D1D1] flex items-center justify-between">
                  <span>Audio File</span>
                  {editingBeat.isBattleSubmission && (
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Locked
                    </span>
                  )}
                </label>
                {editingBeat.isBattleSubmission ? (
                  <div className="w-full bg-[#121212] rounded-xl px-4 py-3 text-xs text-zinc-500 flex items-center gap-2 cursor-not-allowed">
                    <Music className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="truncate">{editingBeat.audioUrl.split("/").pop()}</span>
                  </div>
                ) : (
                  <label className="w-full bg-[#121212] hover:bg-[#1a1a1a] rounded-xl px-4 py-3 text-xs text-zinc-300 flex items-center justify-between cursor-pointer transition-colors">
                    <span className="truncate">{editingBeat.audioUrl.split("/").pop() || "Select new audio"}</span>
                    <span className="text-[#7B61FF] font-bold text-[11px]">Replace Audio</span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => handleAudioUpload(e, false)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* BPM (No arrows) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#D1D1D1]">BPM</label>
                <input
                  type="number"
                  placeholder="e.g. 90 (optional)"
                  value={editingBeat.bpm}
                  onChange={(e) =>
                    setEditingBeat({ ...editingBeat, bpm: e.target.value === "" ? "" : Number(e.target.value) })
                  }
                  className="w-full bg-[#121212] rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#7B61FF] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              {/* For Sale / Not For Sale Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#121212]">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-white block">Available for Sale / Licensing</span>
                  <span className="text-[11px] text-zinc-400 block">
                    {editingBeat.isForSale ? "For Sale" : "Not For Sale"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingBeat({ ...editingBeat, isForSale: !editingBeat.isForSale })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                    editingBeat.isForSale ? "bg-[#7B61FF]" : "bg-[#282828]"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      editingBeat.isForSale ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Preset Standard Tags Selector */}
              <StandardTagSelector
                selectedTags={editingTags}
                onChange={setEditingTags}
              />

              {/* Actions */}
              <div className="flex items-center justify-between pt-4">
                {!editingBeat.isBattleSubmission ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteBeat(editingBeat.id)}
                    className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Beat</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-zinc-500">Battle archive protected</span>
                )}

                <div className="flex items-center gap-2.5 ml-auto">
                  <button
                    type="button"
                    onClick={() => setEditingBeat(null)}
                    className="px-5 py-2.5 rounded-xl bg-[#121212] hover:bg-[#222222] text-zinc-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ADD BEAT MODAL */}
      {isAddModalOpen && (
        <div
          onMouseDown={handleBackdropMouseDown}
          onMouseUp={(e) => handleBackdropMouseUp(e, () => setIsAddModalOpen(false))}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#181818] rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative cursor-default"
          >
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#7B61FF]" />
                <span>Add Beat to Showcase</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#121212] text-zinc-400 hover:text-white flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBeat} className="space-y-4">
              
              {/* Beat Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#D1D1D1]">Beat Title *</label>
                <input
                  type="text"
                  required
                  value={newBeatTitle}
                  onChange={(e) => setNewBeatTitle(e.target.value)}
                  placeholder="e.g. Midnight Soul Flip"
                  className="w-full bg-[#121212] rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
                />
              </div>

              {/* Audio Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#D1D1D1]">Audio File (MP3 / WAV / Opus) *</label>
                <label className="w-full bg-[#121212] hover:bg-[#1a1a1a] rounded-xl px-4 py-3 text-xs text-zinc-300 flex items-center justify-between cursor-pointer transition-colors">
                  <span className="truncate">{newBeatAudioName || "Click to upload audio file"}</span>
                  <span className="text-[#7B61FF] font-bold text-[11px]">Upload</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => handleAudioUpload(e, true)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* BPM (No arrows) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#D1D1D1]">BPM</label>
                <input
                  type="number"
                  placeholder="Optional"
                  value={newBeatBpm}
                  onChange={(e) => setNewBeatBpm(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-[#121212] rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#7B61FF] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              {/* For Sale / Not For Sale Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#121212]">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-white block">Available for Sale / Licensing</span>
                  <span className="text-[11px] text-zinc-400 block">
                    {newBeatIsForSale ? "For Sale" : "Not For Sale"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setNewBeatIsForSale(!newBeatIsForSale)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                    newBeatIsForSale ? "bg-[#7B61FF]" : "bg-[#282828]"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      newBeatIsForSale ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Preset Standard Tags Selector */}
              <StandardTagSelector
                selectedTags={newBeatTags}
                onChange={setNewBeatTags}
              />

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#121212] hover:bg-[#222222] text-zinc-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingBeatAudio || !newBeatAudioUrl || !newBeatTitle.trim()}
                  className="px-6 py-2.5 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isUploadingBeatAudio ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Uploading audio...</span>
                    </>
                  ) : (
                    <span>Add Beat</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CONTACT / LICENSE MODAL */}
      {showContactModal && (
        <div
          onMouseDown={handleBackdropMouseDown}
          onMouseUp={(e) => handleBackdropMouseUp(e, () => setShowContactModal(false))}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#181818] rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative cursor-default"
          >
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#7B61FF]" />
                <span>Contact {producer.nickname}</span>
              </h3>
              <button
                onClick={() => setShowContactModal(false)}
                className="w-8 h-8 rounded-full bg-[#121212] text-zinc-400 hover:text-white flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-zinc-300">
              <p>
                Interested in working together, booking studio sessions, or licensing original beats from <strong className="text-white">{producer.nickname}</strong>?
              </p>

              <div className="bg-[#121212] p-4 rounded-xl space-y-2">
                <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold block">
                  Verified Contact E-mail:
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-white truncate">{producer.email}</span>
                  <button
                    onClick={handleCopyEmail}
                    className="px-3 py-1.5 rounded-lg bg-[#222222] hover:bg-[#2c2c2c] text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                  >
                    {copiedEmail ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Social Channels / Links */}
              {activeLinks.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold block">
                    Social Channels:
                  </span>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {activeLinks.map(([platform, url]) => {
                      const IconComponent = SocialIcons[platform.toLowerCase()] || SocialIcons.website;
                      const hoverColorClasses: Record<string, string> = {
                        instagram: "hover:text-[#E4405F]",
                        youtube: "hover:text-[#FF0000]",
                        spotify: "hover:text-[#1DB954]",
                        bandcamp: "hover:text-[#1DA0C3]",
                        soundcloud: "hover:text-[#FF5500]",
                        beatstars: "hover:text-[#FF3B30]",
                        facebook: "hover:text-[#1877F2]",
                        website: "hover:text-[#7B61FF]",
                      };
                      const hoverColor = hoverColorClasses[platform.toLowerCase()] || "hover:text-[#7B61FF]";
                      const formattedUrl = normalizeUrl(url);

                      return (
                        <a
                          key={platform}
                          href={formattedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-zinc-400 ${hoverColor} transition-colors duration-200 active:scale-95 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#121212] hover:bg-[#1a1a1a] text-xs font-medium`}
                          title={`${platform.charAt(0).toUpperCase() + platform.slice(1)}: ${url}`}
                        >
                          <IconComponent className="w-4 h-4" />
                          <span className="capitalize">{platform}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Save Toast Pop-up Notification */}
      {saveToastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#181818] text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 backdrop-blur-md">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Showcase Updated</p>
            <p className="text-[11px] text-zinc-400">{saveToastMessage}</p>
          </div>
        </div>
      )}

    </div>
  );
}
