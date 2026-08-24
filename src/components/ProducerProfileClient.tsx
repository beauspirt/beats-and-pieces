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
import { DiscoveryBeat, JudgeFeedbackItem, UserProfile, STANDARD_BEAT_TAGS, VaultItem } from "@/lib/types";
import { producerService, battleService, beatService, storageService, vaultService } from "@/services";
import { normalizeUrl } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { JudgeFeedbackTicker } from "@/components/JudgeFeedbackTicker";
import { 
  Flame, Trophy, Mail, ExternalLink, 
  CheckCircle2, Copy, MapPin, Calendar, Star, Award, Globe,
  Pencil, Plus, Lock, Trash2, AlertTriangle, Music, Sliders, X, Play
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

const SOCIAL_PLATFORM_ORDER = [
  "website",
  "instagram",
  "facebook",
  "youtube",
  "spotify",
  "bandcamp",
  "beatstars",
  "soundcloud",
];

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
    <svg className={className} viewBox="0 0 64 64" fill="currentColor">
      <path
        d="M1986.328 716.21c-.475-.183-.602-.373-.606-.74v-19.988c.01-.385.304-.706.68-.744.016-.001 17.345-.01 17.457-.01a6.3 6.3 0 0 1 6.298 6.298 6.3 6.3 0 0 1-8.733 5.809c-.5 5.675-5.26 10.128-11.066 10.128-1.42 0-2.805-.28-4.028-.754m-2.587-1.415l-.285-14.187.285-5.15c.01-.376.316-.686.694-.686a.7.7 0 0 1 .693.691v-.005l.31 5.15-.31 14.188c-.01.38-.316.69-.693.69a.7.7 0 0 1-.694-.693m-2.107-1.178l-.244-13.003c0-.01.244-5.228.244-5.228a.66.66 0 0 1 .65-.644.66.66 0 0 1 .65.647v-.003.003l.274 5.22-.274 13.01a.66.66 0 0 1-.65.646c-.352 0-.643-.3-.65-.647m-6.3-1.363l-.322-11.64.323-5.345c.01-.286.235-.512.518-.512s.51.227.52.514h0v.003l.363 5.34-.363 11.64c-.01.3-.237.516-.52.516a.52.52 0 0 1-.519-.516m2.083-.298l-.296-11.344.297-5.293c.01-.31.254-.558.563-.558s.553.247.562.56v-.003l.333 5.294-.333 11.344c-.01.314-.255.56-.562.56s-.557-.247-.564-.56m-4.15-.08l-.35-11.262.35-5.377a.48.48 0 0 1 .475-.469.48.48 0 0 1 .475.471l.393 5.375-.393 11.263c-.01.264-.22.47-.475.47a.48.48 0 0 1-.475-.472m6.25-.334l-.27-10.93.27-5.26c.01-.335.274-.6.607-.6s.598.264.605.603v-.004l.304 5.26-.304 10.93a.61.61 0 0 1-.605.604c-.333 0-.6-.266-.607-.604m-8.3-.53c0-.001-.374-10.394-.374-10.394l.374-5.433c.01-.238.2-.426.432-.426a.44.44 0 0 1 .432.427l.423 5.432-.423 10.394a.44.44 0 0 1-.432.427c-.232 0-.42-.188-.432-.427m-2.034-1.934l-.4-8.46.4-5.466c.01-.214.18-.382.387-.382s.376.168.388.383h0l.453 5.467-.453 8.46c-.013.214-.183.384-.388.384s-.377-.17-.387-.384m-4.018-2.853l-.452-5.605.452-5.422c.013-.168.142-.294.3-.294s.286.126.3.294l.512 5.422-.512 5.607c-.015.167-.143.294-.3.294s-.288-.128-.3-.296m-1.984-.148c0-.001-.478-5.456-.478-5.456l.478-5.256c.015-.147.122-.252.257-.252s.24.105.256.25l.543 5.257-.542 5.456c-.016.145-.124.25-.257.25s-.243-.107-.257-.25m3.985-.258l-.425-5.2.425-5.467a.35.35 0 0 1 .344-.34c.182 0 .33.146.344.34l.484 5.468-.484 5.202c-.015.19-.16.336-.344.336s-.332-.145-.344-.34m-5.953-.6c0-.001-.504-4.597-.504-4.597l.504-4.497c.015-.12.105-.207.214-.207s.195.084.212.206l.572 4.498-.572 4.597c-.02.122-.106.207-.213.207s-.2-.087-.214-.207m-1.885-1.754l-.374-2.843.374-2.795c.015-.118.1-.2.206-.2s.188.082.204.2l.444 2.796-.444 2.844c-.015.117-.1.2-.204.2s-.192-.082-.206-.2"
        transform="matrix(1.25 0 0 -1.25 -2448.6946 912.30772)"
      />
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
    const refresh = () => {
      const fresh = producerService.getProducerById(producerId) || producerService.getProducerByTag(producerId);
      if (fresh) {
        setProducer(fresh);
      }
      setBeatsVersion((v) => v + 1);
    };

    // 1. Sync latest producers and beats from Supabase
    Promise.all([
      producerService.syncFromSupabase(),
      beatService.syncFromSupabase(),
    ]).then(refresh);

    // 2. Listen to real-time local updates and storage changes
    window.addEventListener("bnp_beats_updated", refresh);
    window.addEventListener("bnp_producers_updated", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("bnp_beats_updated", refresh);
      window.removeEventListener("bnp_producers_updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [producerId]);

  const [copiedEmail, setCopiedEmail] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [activeVaultModalItem, setActiveVaultModalItem] = useState<VaultItem | null>(null);
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

  // Lock page scrolling when any modal is open
  useBodyScrollLock(Boolean(editingBeat || isAddModalOpen || showContactModal || activeVaultModalItem));

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

    const matchesProducer = (bId: string, bTag: string) => {
      const cleanBId = (bId || "").toLowerCase().trim();
      const cleanBTag = (bTag || "").toLowerCase().trim();
      const pId = (producer.id || "").toLowerCase().trim();
      const pNick = (producer.nickname || "").toLowerCase().trim();
      const pEmail = (producer.email || "").toLowerCase().trim();

      if (cleanBId && (cleanBId === pId || cleanBId === pNick || cleanBId === pEmail)) return true;
      if (cleanBTag && (cleanBTag === pId || cleanBTag === pNick || cleanBTag === pEmail)) return true;

      const resolvedFromId = producerService.getProducerById(bId) || producerService.getProducerByTag(bId);
      if (resolvedFromId && (resolvedFromId.id.toLowerCase() === pId || resolvedFromId.nickname.toLowerCase() === pNick)) return true;

      const resolvedFromTag = producerService.getProducerById(bTag) || producerService.getProducerByTag(bTag);
      if (resolvedFromTag && (resolvedFromTag.id.toLowerCase() === pId || resolvedFromTag.nickname.toLowerCase() === pNick)) return true;

      return false;
    };

    const baseBeats = allBeats.filter((b) => matchesProducer(b.beatmaker.id, b.beatmaker.tag));

    const submissions = sampleSubmissions.filter((s) => matchesProducer(s.userId, s.beatmakerTag));

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
        const flameVal = typeof sub.flameRating === "number" && !isNaN(sub.flameRating) && sub.flameRating >= 1
          ? Math.min(5.0, Math.max(1.0, sub.flameRating))
          : undefined;

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

  // Compute prioritized badges: Admin -> Battle Champion -> Podium Finalist / Community
  const sortedBadges = useMemo(() => {
    const rawRoles = new Set<string>(
      (producer.discordRoles || []).filter(
        (r) =>
          !r.toLowerCase().startsWith("winner bb") &&
          !r.toLowerCase().startsWith("winner #") &&
          r.toLowerCase() !== "judge" &&
          r.toLowerCase() !== "jury" &&
          r.toLowerCase() !== "host" &&
          !r.toLowerCase().includes("og")
      )
    );

    // 1. Automatic Battle Champion: Check if producer has won any battle (1st place) or has battlesWon > 0
    const hasWonAnyBattle =
      (producer.stats?.battlesWon && producer.stats.battlesWon > 0) ||
      prioritizedBeats.some((b) => b.rank === 1);
    if (hasWonAnyBattle) {
      rawRoles.add("Battle Champion");
    }

    // 2. Inject system roles if applicable (Admin)
    if (producer.role === "admin" || producer.email === "adrian.hrihor@gmail.com" || producer.nickname.toLowerCase() === "nerub") {
      rawRoles.add("Admin");
    }

    const roleRank = (roleName: string): number => {
      const lower = roleName.toLowerCase();
      if (lower === "admin") return 1;
      if (lower.includes("champion") || lower.includes("winner") || lower.includes("1st")) return 2;
      return 3;
    };

    return Array.from(rawRoles).sort((a, b) => roleRank(a) - roleRank(b));
  }, [producer, prioritizedBeats]);

  const producerVaultItems = useMemo(() => {
    return vaultService.getItemsByProducer(producer.id || producer.nickname);
  }, [producer]);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(producer.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleOpenEditModal = (beat: DiscoveryBeat & { competitionTitle?: string }) => {
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
        // console.warn("In-memory audio decode warning:", decodeErr);
      }

      // 2. Upload to Supabase Storage 'beats' folder
      const { url, error: uploadError } = await storageService.uploadAudio(
        file,
        "beats",
        `${producer.id}-${Date.now()}`
      );

      if (!url) {
        alert("Audio upload failed: " + (uploadError || "Unable to upload audio file."));
        return;
      }

      const finalAudioUrl = url;
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
      // console.error("Audio upload error:", err);
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

  const handleCreateBeat = async (e: React.FormEvent) => {
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

    await beatService.createBeat({
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

  const activeLinks = useMemo(() => {
    return Object.entries(producer.links || {})
      .filter(([_, url]) => Boolean(url && url.trim()))
      .sort(([a], [b]) => {
        const indexA = SOCIAL_PLATFORM_ORDER.indexOf(a.toLowerCase());
        const indexB = SOCIAL_PLATFORM_ORDER.indexOf(b.toLowerCase());
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
      });
  }, [producer.links]);

  return (
    <div className="w-full space-y-12 animate-in fade-in duration-300">
      
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
              <span>Add Beat</span>
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
          <div className="space-y-4">
            {prioritizedBeats.map((beat) => (
              <div
                key={beat.id}
                className="bg-[#181818] rounded-2xl p-4 sm:p-5 space-y-3 shadow-md group relative"
              >
                {/* Row 1: Header (Title, Rank Badge, Meta, Edit Action) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* Left: Beat Title + Quick Link Badge + Rank Badge */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
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
                                className="px-2 py-0.5 rounded-md bg-[#7B61FF]/15 text-[#A78BFA] hover:bg-[#7B61FF]/25 hover:text-white text-[11px] font-bold shrink-0 transition-all inline-flex items-center gap-1 select-none"
                                title={`View ${beat.battleSource || `Beat Battle #${match[1]}`}`}
                              >
                                <span>BB#{match[1]}</span>
                                <span className="text-[9px]">↗</span>
                              </Link>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Right: BPM, Price Tag, Flames, Edit Button */}
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center select-none">
                    {beat.bpm ? (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#121212] text-[#888888] select-none">
                        {beat.bpm} BPM
                      </span>
                    ) : null}

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
                      <div className="flex items-center gap-1 text-xs sm:text-sm text-[#7B61FF] font-bold px-2 select-none" title="Jury Score Average">
                        <Star className="w-4 h-4 fill-current text-[#7B61FF]" />
                        <span>{beat.juryScore.toFixed(2)}</span>
                      </div>
                    ) : null}

                    {/* Public Rating Avg */}
                    {typeof beat.flames === "number" && beat.flames >= 1 ? (
                      <div className="flex items-center gap-1 text-xs sm:text-sm text-[#FF5E3A] font-bold px-2 select-none" title="Public Rating Average">
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
                  artist={producer.nickname}
                  artistId={producer.id}
                  coverUrl={beat.beatmaker?.avatarUrl || producer.avatarUrl}
                  audioUrl={beat.audioUrl}
                  waveformPeaks={beat.waveform}
                  duration={beat.duration}
                  bpm={beat.bpm}
                  compact={true}
                />

                {/* Row 3: Beat Tags */}
                {beat.tags && beat.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-0.5 select-none">
                    {beat.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 rounded-full bg-[#121212] text-[#888888] font-medium text-xs select-none"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Row 4: Judge Feedback Loop / Ticker */}
                {beat.juryFeedbacksList && beat.juryFeedbacksList.length > 0 && (
                  <JudgeFeedbackTicker feedbacks={beat.juryFeedbacksList} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#181818] rounded-2xl p-8 text-center space-y-2">
            <p className="text-zinc-400 text-sm">
              This producer hasn&apos;t submitted any beats yet.
            </p>
          </div>
        )}
      </div>

      {/* SECTION 3: FEATURED VAULT MEDIA */}
      {producerVaultItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Featured In Vault
            </h2>
            <Link
              href="/vault"
              className="text-xs text-zinc-400 hover:text-[#7B61FF] font-semibold transition-colors"
            >
              Explore Vault →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {producerVaultItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveVaultModalItem(item)}
                className="bg-[#181818] hover:bg-[#222222] p-4 rounded-2xl flex items-center gap-4 transition-colors group shadow-md cursor-pointer select-none"
              >
                <div className="w-24 h-16 rounded-xl overflow-hidden relative shrink-0 bg-[#121212]">
                  {item.youtubeId ? (
                    <Image
                      src={`https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg`}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7B61FF] block">
                    {item.category === "breakdowns" ? "Beat Breakdown" : "Live Set"}
                  </span>
                  <h4 className="text-sm font-bold text-white truncate">
                    {item.title}
                  </h4>
                </div>
                <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-white shrink-0 transition-colors mr-1" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EDIT BEAT MODAL */}
      {editingBeat && (
        <div
          onMouseDown={handleBackdropMouseDown}
          onMouseUp={(e) => handleBackdropMouseUp(e, () => setEditingBeat(null))}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#181818] rounded-2xl max-w-2xl sm:max-w-3xl w-full p-5 sm:p-7 space-y-5 shadow-2xl relative cursor-default max-h-[90vh] overflow-y-auto no-scrollbar"
          >
            <div className="flex items-center justify-between pb-1">
              <div className="space-y-0.5">
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

            {/* Battle submission limitation notice */}
            {editingBeat.isBattleSubmission && (
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-300 text-xs flex items-start gap-2.5 leading-relaxed">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  This beat is part of a historical battle archive ({((editingBeat.battleSource || "Beat Battle").replace(/\s*\([^)]*\)/g, "")).trim()}). The <strong>Beat Title</strong> and <strong>Audio Master</strong> cannot be changed or deleted to preserve competition records.
                </p>
              </div>
            )}

            <form onSubmit={handleSaveEditBeat} className="space-y-4">
              
              {/* Row 1: Beat Title & Audio File (2 Columns on sm+) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                    className={`w-full bg-[#121212] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none ${
                      editingBeat.isBattleSubmission
                        ? "opacity-60 cursor-not-allowed"
                        : "focus:ring-1 focus:ring-[#7B61FF]"
                    }`}
                  />
                </div>

                {/* Audio Replacement */}
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
                    <div className="w-full bg-[#121212] rounded-xl px-4 py-2.5 text-xs text-zinc-500 flex items-center gap-2 cursor-not-allowed">
                      <Music className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                      <span className="truncate">{editingBeat.audioUrl.split("/").pop()}</span>
                    </div>
                  ) : (
                    <label className="w-full bg-[#121212] hover:bg-[#1a1a1a] rounded-xl px-4 py-2.5 text-xs text-zinc-300 flex items-center justify-between cursor-pointer transition-colors">
                      <span className="truncate">{editingBeat.audioUrl.split("/").pop() || "Select new audio"}</span>
                      <span className="text-[#7B61FF] font-bold text-[11px] shrink-0 ml-2">Replace</span>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => handleAudioUpload(e, false)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Row 2: BPM & Availability Toggle (2 Columns on sm+) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* BPM */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#D1D1D1]">BPM</label>
                  <input
                    type="number"
                    placeholder="e.g. 90 (optional)"
                    value={editingBeat.bpm}
                    onChange={(e) =>
                      setEditingBeat({ ...editingBeat, bpm: e.target.value === "" ? "" : Number(e.target.value) })
                    }
                    className="w-full bg-[#121212] rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#7B61FF] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                {/* For Sale / Not For Sale Toggle */}
                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#121212] self-end">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-white block">Available for Sale / Licensing</span>
                    <span className="text-[10px] text-zinc-400 block">
                      {editingBeat.isForSale ? "For Sale" : "Not For Sale"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingBeat({ ...editingBeat, isForSale: !editingBeat.isForSale })}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                      editingBeat.isForSale ? "bg-[#7B61FF]" : "bg-[#282828]"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        editingBeat.isForSale ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Preset Standard Tags Selector */}
              <StandardTagSelector
                selectedTags={editingTags}
                onChange={setEditingTags}
              />

              {/* Actions */}
              <div className="flex items-center justify-between pt-3">
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#181818] rounded-2xl max-w-2xl sm:max-w-3xl w-full p-5 sm:p-7 space-y-5 shadow-2xl relative cursor-default max-h-[90vh] overflow-y-auto no-scrollbar"
          >
            <div className="flex items-center justify-between pb-1">
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
              
              {/* Row 1: Beat Title & Audio Upload (2 Columns on sm+) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Beat Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#D1D1D1]">Beat Title *</label>
                  <input
                    type="text"
                    required
                    value={newBeatTitle}
                    onChange={(e) => setNewBeatTitle(e.target.value)}
                    placeholder="e.g. Midnight Soul Flip"
                    className="w-full bg-[#121212] rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
                  />
                </div>

                {/* Audio Upload */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#D1D1D1]">Audio File (MP3 / WAV / Opus) *</label>
                  <label className="w-full bg-[#121212] hover:bg-[#1a1a1a] rounded-xl px-4 py-2.5 text-xs text-zinc-300 flex items-center justify-between cursor-pointer transition-colors">
                    <span className="truncate">{newBeatAudioName || "Click to upload audio file"}</span>
                    <span className="text-[#7B61FF] font-bold text-[11px] shrink-0 ml-2">Upload</span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => handleAudioUpload(e, true)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Row 2: BPM & Availability Toggle (2 Columns on sm+) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* BPM */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#D1D1D1]">BPM</label>
                  <input
                    type="number"
                    placeholder="Optional"
                    value={newBeatBpm}
                    onChange={(e) => setNewBeatBpm(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-[#121212] rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#7B61FF] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                {/* For Sale / Not For Sale Toggle */}
                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#121212] self-end">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-white block">Available for Sale / Licensing</span>
                    <span className="text-[10px] text-zinc-400 block">
                      {newBeatIsForSale ? "For Sale" : "Not For Sale"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewBeatIsForSale(!newBeatIsForSale)}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                      newBeatIsForSale ? "bg-[#7B61FF]" : "bg-[#282828]"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        newBeatIsForSale ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Preset Standard Tags Selector */}
              <StandardTagSelector
                selectedTags={newBeatTags}
                onChange={setNewBeatTags}
              />

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3">
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#181818] rounded-2xl max-w-md w-full p-5 sm:p-8 space-y-6 shadow-2xl relative cursor-default max-h-[90vh] overflow-y-auto no-scrollbar"
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
              <div className="bg-[#121212] p-4 rounded-xl">
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

              {/* Socials */}
              {activeLinks.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold block">
                    Socials
                  </span>
                  <div className="flex flex-wrap items-center gap-3.5">
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
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Save Toast Pop-up Notification */}
      {saveToastMessage && (
        <div className="fixed bottom-6 right-6 z-[110] bg-[#181818] text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 backdrop-blur-md">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Showcase Updated</p>
            <p className="text-[11px] text-zinc-400">{saveToastMessage}</p>
          </div>
        </div>
      )}

      {/* IN-APP VAULT VIDEO MODAL */}
      {activeVaultModalItem && (
        <div
          onClick={() => setActiveVaultModalItem(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#181818] rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl space-y-4 p-4 sm:p-6 relative cursor-default"
          >
            {/* Modal Close Button */}
            <div className="flex items-center justify-end">
              <button
                onClick={() => setActiveVaultModalItem(null)}
                className="w-8 h-8 rounded-full bg-[#121212] text-zinc-400 hover:text-white flex items-center justify-center text-sm cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Embedded 16:9 YouTube Player */}
            <div className="w-full aspect-video rounded-xl overflow-hidden bg-black relative shadow-inner">
              <iframe
                src={`https://www.youtube.com/embed/${activeVaultModalItem.youtubeId}?autoplay=1`}
                title={activeVaultModalItem.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end pt-1 text-xs">
              <a
                href={activeVaultModalItem.youtubeUrl}
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
