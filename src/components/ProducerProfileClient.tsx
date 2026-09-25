"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sampleProducers, sampleDiscoveryBeats, sampleSubmissions } from "@/lib/mock-data";
import { 
  AudioWaveformPlayer,
  extractRealAudioBufferWaveform,
  globalWaveformCache,
  WaveformData,
} from "@/components/AudioWaveformPlayer";
import { DiscoveryBeat, JudgeFeedbackItem, UserProfile, STANDARD_BEAT_TAGS, VaultItem } from "@/lib/types";
import { producerService, battleService, beatService, storageService, vaultService, activityLogService } from "@/services";
import { validateHandle, sanitizeHandle } from "@/services/producerService";
import { normalizeUrl } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { JudgeFeedbackTicker } from "@/components/JudgeFeedbackTicker";
import { ClientPortal } from "@/components/ClientPortal";
import { ImageCropperModal } from "@/components/ImageCropperModal";
import { 
  Flame, Trophy, Mail, ExternalLink, 
  CheckCircle2, Copy, MapPin, Calendar, Star, Award, Globe,
  Pencil, Plus, Lock, Trash2, AlertTriangle, Music, Sliders, X, Play, Upload,
  Share2, Check, SlidersHorizontal, ChevronDown, ArrowLeft, Loader2
} from "lucide-react";

const SOCIAL_PLATFORMS = [
  { key: "website", label: "Website", placeholder: "https://yourwebsite.com" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourhandle" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourhandle" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourhandle" },
  { key: "spotify", label: "Spotify", placeholder: "https://open.spotify.com/artist/..." },
  { key: "bandcamp", label: "Bandcamp", placeholder: "https://yourname.bandcamp.com" },
  { key: "beatstars", label: "BeatStars", placeholder: "https://beatstars.com/yourhandle" },
  { key: "soundcloud", label: "SoundCloud", placeholder: "https://soundcloud.com/yourhandle" },
];

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
      if (selectedTags.length >= 5) {
        alert("Maximum of 5 tags allowed per beat.");
        return;
      }
      onChange([...selectedTags, tag].slice(0, 5));
      setSearch("");
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
        <label className="text-xs font-bold text-white">Tags</label>
        {selectedTags.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Currently Selected Tags Pills Strip */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-1">
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#7B61FF]/15 text-xs text-zinc-200 font-bold leading-none select-none"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => toggleTag(tag)}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer text-xs inline-flex items-center justify-center"
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
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (filteredOptions.length > 0) {
                const exact = filteredOptions.find((t) => t.toLowerCase() === search.toLowerCase().trim());
                const tagToAdd = exact || filteredOptions[0];
                if (tagToAdd && !selectedTags.includes(tagToAdd)) {
                  toggleTag(tagToAdd);
                }
              }
            }
          }}
          placeholder={selectedTags.length === 0 ? "Search or select tags (e.g. Trap, Lo-Fi, Soulful)..." : "Add more tags from list..."}
          className="w-full bg-[#121212] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#7B61FF] transition-all"
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
        <div className="p-2 bg-[#121212] rounded-xl max-h-48 overflow-y-auto space-y-1 shadow-2xl z-20">
          <div className="flex flex-wrap gap-1.5">
            {filteredOptions.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 leading-none ${
                    isSelected
                      ? "bg-[#7B61FF] text-white shadow-sm"
                      : "bg-[#1f1f1f] text-zinc-300 hover:bg-[#2a2a2a] hover:text-white"
                  }`}
                >
                  <span>{tag}</span>
                  {isSelected ? <span>✓</span> : <span className="text-zinc-500 text-xs">+</span>}
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

function Tooltip({
  content,
  children,
  position = "top",
  className = "",
}: {
  content: string;
  children: React.ReactNode;
  position?: "top" | "bottom";
  className?: string;
}) {
  return (
    <div className={`group/tooltip relative inline-flex items-center ${className}`}>
      {children}
      <div
        className={`absolute ${
          position === "top" ? "bottom-full mb-2" : "top-full mt-2"
        } left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#1E1E1E] text-white text-[11px] font-semibold rounded-lg shadow-2xl whitespace-nowrap pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-all duration-150 z-50 flex items-center gap-1 leading-none select-none`}
      >
        <span>{content}</span>
        <div
          className={`absolute ${
            position === "top"
              ? "top-full border-t-[#1E1E1E]"
              : "bottom-full border-b-[#1E1E1E]"
          } left-1/2 -translate-x-1/2 border-4 border-transparent`}
        />
      </div>
    </div>
  );
}

export function ProducerProfileClient({ producerId }: { producerId: string }) {
  const { user: authUser, updateUser } = useAuth();
  const router = useRouter();

  const [producer, setProducer] = useState<UserProfile | null | undefined>(() => {
    return producerService.getProducerById(producerId) || producerService.getProducerByTag(producerId) || sampleProducers[producerId];
  });
  const [hasChecked, setHasChecked] = useState(false);

  // Beat Deletion Confirmation Modal State
  const [beatToDelete, setBeatToDelete] = useState<{ id: string; title: string } | null>(null);

  // Profile Direct Editing States
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Display Name Edit State
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [isSavingNickname, setIsSavingNickname] = useState(false);

  // Profile URL Handle Edit State
  const [isEditingHandle, setIsEditingHandle] = useState(false);
  const [handleInput, setHandleInput] = useState("");
  const [handleError, setHandleError] = useState<string | null>(null);
  const [isSavingHandle, setIsSavingHandle] = useState(false);

  // Bio Inline Edit State
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState("");
  const [isSavingBio, setIsSavingBio] = useState(false);

  // Location Inline Edit State
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [isSavingLocation, setIsSavingLocation] = useState(false);

  // Social Links Modal State
  const [isSocialsModalOpen, setIsSocialsModalOpen] = useState(false);
  const [socialsInput, setSocialsInput] = useState<Record<string, string>>({});
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [isSavingSocials, setIsSavingSocials] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const fresh = producerService.getProducerById(producerId) || producerService.getProducerByTag(producerId);
      setProducer(fresh || null);
      setBeatsVersion((v) => v + 1);
    };

    // 1. Sync latest producers, beats, and battles from Supabase
    Promise.all([
      producerService.syncFromSupabase(),
      beatService.syncFromSupabase(),
      battleService.syncFromSupabase(),
    ]).then(() => {
      refresh();
      setHasChecked(true);
    });

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

  const [emailCopiedTooltip, setEmailCopiedTooltip] = useState(false);
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
    duration?: number;
    waveform?: number[];
  } | null>(null);
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [editingTagInput, setEditingTagInput] = useState("");

  // Add Beat Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [stagedNewBeatFile, setStagedNewBeatFile] = useState<File | null>(null);
  const [isDraggingNewBeat, setIsDraggingNewBeat] = useState(false);
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

  // Sorting state for beats list (exact match with Beats discovery page)
  const [beatsSortBy, setBeatsSortBy] = useState<"recent" | "rating">("recent");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);

  const sortLabelMap: Record<"recent" | "rating", string> = {
    recent: "Most Recent",
    rating: "Top Rated",
  };

  // Close sort menu on click outside
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

  const [saveToastMessage, setSaveToastMessage] = useState<string | null>(null);

  // Lock page scrolling when any modal is open
  useBodyScrollLock(Boolean(editingBeat || isAddModalOpen || activeVaultModalItem));

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
        setEditingBeat(null);
        setIsAddModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Check if active user is the owner of this profile (strictly owner only)
  const isProfileOwner = Boolean(
    authUser && producer && (
      authUser.id === producer.id ||
      (authUser.handle && producer.handle && authUser.handle.toLowerCase() === producer.handle.toLowerCase()) ||
      (authUser.nickname && authUser.nickname.toLowerCase() === producer.nickname.toLowerCase())
    )
  );

  // Merge and prioritize all beats for this producer dynamically from beatService
  const prioritizedBeats = useMemo(() => {
    if (!producer) return [];
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

    const submissions = battleService.getAllSubmissions().filter((s) => matchesProducer(s.userId, s.beatmakerTag));

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
      // Check if battle still exists (has not been deleted), has reached results (completed), and is not a remix battle
      const battle = battleService.getBattleById(sub.battleId);
      if (!battle || battle.phase !== "completed" || sub.battleId === "battle-6" || (battle as unknown as { isRemixBattle?: boolean }).isRemixBattle || (sub as unknown as { isRemix?: boolean }).isRemix) return;

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

  // Apply active sorting mode matching Beats discovery page
  const displayedBeats = useMemo(() => {
    const list = [...prioritizedBeats];
    if (beatsSortBy === "recent") {
      return list.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        const diff = timeB - timeA;
        if (diff !== 0) return diff;
        return (b.id || "").localeCompare(a.id || "");
      });
    }
    if (beatsSortBy === "rating") {
      return list.sort((a, b) => {
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
      });
    }
    return list;
  }, [prioritizedBeats, beatsSortBy]);

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
    if (!producer) return [];
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
      prioritizedBeats.some((b) => b.rank === 1 && Boolean(b.battleSource || b.competitionTitle));
    if (hasWonAnyBattle) {
      rawRoles.add("Battle Champion");
    }

    // 2. Inject system roles if applicable (Admin)
    if (producer && (producer.role === "admin" || producer.email === "adrian.hrihor@gmail.com" || producer.nickname.toLowerCase() === "nerub")) {
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
    if (!producer) return [];
    return vaultService.getItemsByProducer(producer.id || producer.nickname);
  }, [producer]);

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
      duration: beat.duration || 120,
      waveform: beat.waveform || [],
    });
    setEditingTags(rawTags.filter(Boolean));
    setEditingTagInput("");
  };

  const processNewBeatFile = async (file: File) => {
    if (!file) return;
    const MAX_FILE_SIZE = 250 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      alert(`File is too large (${sizeMB} MB). Maximum source audio size is 250 MB.`);
      return;
    }

    setStagedNewBeatFile(file);
    setNewBeatAudioName(file.name);
    if (!newBeatTitle.trim()) {
      setNewBeatTitle(file.name.replace(/\.[^/.]+$/, ""));
    }

    // Instantly decode arrayBuffer in memory for exact waveform & duration preview
    let realDuration = 120;
    let extractedPeaks: number[] = [];
    try {
      const arrayBuf = await file.arrayBuffer();
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const decoded = await ctx.decodeAudioData(arrayBuf.slice(0));
        const extracted = extractRealAudioBufferWaveform(decoded, 800);
        realDuration = Math.round(decoded.duration);
        extractedPeaks = extracted ? extracted.peaks : [];
        ctx.close();

        const tempAudioUrl = URL.createObjectURL(file);
        if (extracted) {
          globalWaveformCache.set(tempAudioUrl, extracted);
        }
        setNewBeatAudioUrl(tempAudioUrl);
        setNewBeatDuration(realDuration);
        setNewBeatWaveformPeaks(extractedPeaks);
      }
    } catch {
      const tempAudioUrl = URL.createObjectURL(file);
      setNewBeatAudioUrl(tempAudioUrl);
    }

    // Transcode and upload to Supabase Storage immediately in the background
    setIsUploadingBeatAudio(true);
    try {
      const producerSlug = producer?.handle || producer?.id || authUser?.handle || authUser?.id || "producer";
      const { url, error: uploadError, duration, waveformPeaks } = await storageService.uploadAudio(
        file,
        `beats/${producerSlug}`
      );

      if (!url) {
        alert("Audio upload failed: " + (uploadError || "Unable to upload audio file."));
        return;
      }

      setNewBeatAudioUrl(url);
      if (duration) setNewBeatDuration(duration);
      if (waveformPeaks && waveformPeaks.length > 0) {
        setNewBeatWaveformPeaks(waveformPeaks);
        globalWaveformCache.set(url, {
          peaks: waveformPeaks,
          duration: duration || realDuration,
        });
      } else if (extractedPeaks.length > 0) {
        globalWaveformCache.set(url, {
          peaks: extractedPeaks,
          duration: duration || realDuration,
        });
      }
    } catch (err: unknown) {
      alert("Failed to upload audio: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsUploadingBeatAudio(false);
    }
  };

  const handleNewBeatDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingNewBeat(true);
  };

  const handleNewBeatDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingNewBeat(false);
  };

  const handleNewBeatDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingNewBeat(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processNewBeatFile(file);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>, isNew: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isNew) {
      await processNewBeatFile(file);
      return;
    }

    const MAX_FILE_SIZE = 250 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      alert(`File is too large (${sizeMB} MB). Maximum source audio size is 250 MB.`);
      e.target.value = "";
      return;
    }

    setIsUploadingBeatAudio(true);
    try {
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
      } catch {
        // decode fallback
      }

      const producerSlug = producer?.handle || producer?.id || authUser?.handle || authUser?.id || "producer";
      const { url, error: uploadError } = await storageService.uploadAudio(
        file,
        `beats/${producerSlug}`
      );

      if (!url) {
        alert("Audio upload failed: " + (uploadError || "Unable to upload audio file."));
        return;
      }

      const finalAudioUrl = url;
      if (extractedWaveform) {
        globalWaveformCache.set(finalAudioUrl, extractedWaveform);
      }

      if (editingBeat && !editingBeat.isBattleSubmission) {
        setEditingBeat({
          ...editingBeat,
          audioUrl: finalAudioUrl,
          duration: realDuration || editingBeat.duration || 120,
          waveform: extractedWaveform ? extractedWaveform.peaks : (editingBeat.waveform || []),
        });
      }
    } catch {
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
      // Battle submissions: update title, BPM, priceTag, and tags only (not audio)
      beatService.updateBeat(editingBeat.id, {
        title: editingBeat.title.trim() || "Untitled Beat",
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
      showToast("Battle submissions cannot be deleted as they are part of the battle archive.");
      return;
    }
    if (editingBeat) {
      setBeatToDelete(editingBeat);
    }
  };

  const handleCreateBeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAtBeatLimit) {
      showToast(`You have reached the maximum limit of ${MAX_FREE_BEATS} uploaded showcase beats.`);
      return;
    }
    if (!newBeatTitle.trim()) {
      showToast("Please enter a beat title.");
      return;
    }
    if (isUploadingBeatAudio) {
      showToast("Please wait for audio transcoding and upload to complete.");
      return;
    }
    if (!newBeatAudioUrl.trim()) {
      showToast("Please select or drop an audio file.");
      return;
    }

    try {
      let finalAudioUrl = newBeatAudioUrl;
      let finalDuration = newBeatDuration;
      let finalPeaks = newBeatWaveformPeaks;

      // Fallback if background upload hasn't replaced blob URL
      if (stagedNewBeatFile && (!finalAudioUrl || finalAudioUrl.startsWith("blob:"))) {
        setIsUploadingBeatAudio(true);
        const producerSlug = producer?.handle || producer?.id || authUser?.handle || authUser?.id || "producer";
        const { url, error: uploadError, duration, waveformPeaks } = await storageService.uploadAudio(
          stagedNewBeatFile,
          `beats/${producerSlug}`
        );

        if (!url) {
          throw new Error(uploadError || "Failed to upload audio to cloud storage.");
        }
        finalAudioUrl = url;
        if (duration) finalDuration = duration;
        if (waveformPeaks && waveformPeaks.length > 0) finalPeaks = waveformPeaks;
      }

      if (finalPeaks && finalPeaks.length > 0) {
        globalWaveformCache.set(finalAudioUrl, {
          peaks: finalPeaks,
          duration: finalDuration,
        });
      }

      const bpmValue = newBeatBpm !== "" && !isNaN(Number(newBeatBpm)) ? Number(newBeatBpm) : undefined;

      await beatService.createBeat({
        title: newBeatTitle.trim(),
        beatmaker: {
          id: producer?.id || authUser?.id || "producer",
          tag: producer?.nickname || authUser?.nickname || "Producer",
          avatarUrl: producer?.avatarUrl || authUser?.avatarUrl || "/avatars/default-avatar.png",
        },
        audioUrl: finalAudioUrl,
        duration: finalDuration,
        waveform: finalPeaks,
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
      setStagedNewBeatFile(null);
      setNewBeatBpm("");
      setNewBeatIsForSale(false);
      setNewBeatTags([]);
      setNewBeatTagInput("");
      setNewBeatWaveformPeaks([]);
      setBeatsVersion((v) => v + 1);
      showToast("Beat added to your showcase!");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err) || "Failed to create beat");
    } finally {
      setIsUploadingBeatAudio(false);
    }
  };

  const [copiedShareLink, setCopiedShareLink] = useState(false);

  const handleShareProfile = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://www.beatsandpieces.ro";
    const profileSlug = producer?.handle || producer?.id || authUser?.handle || authUser?.id || "producer";
    const profileUrl = `${origin}/${profileSlug}`;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(profileUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = profileUrl;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2500);
    } catch {
      // Fallback silent handle
    }
  };

  const handleCopyEmail = async () => {
    if (!producer?.email) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(producer.email);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = producer.email;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
    } catch {}
    setEmailCopiedTooltip(true);
    setTimeout(() => setEmailCopiedTooltip(false), 2000);
  };

  // Avatar Upload & Crop Handlers
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCropperSrc(reader.result as string);
        setIsCropperOpen(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleCropComplete = async (croppedBlob: Blob, croppedDataUrl: string) => {
    if (!producer) return;
    setIsCropperOpen(false);
    setIsUploadingAvatar(true);

    try {
      // 1. Optimistic UI update
      setProducer({
        ...producer,
        avatarUrl: croppedDataUrl,
      });

      // 2. Upload to storage
      const { url, error } = await storageService.uploadImage(
        croppedBlob,
        "avatars",
        `${producer.id}-${Date.now()}`
      );

      if (error || !url) {
        throw new Error(error || "Upload failed");
      }

      // 3. Save avatar URL to user profile
      const updated = await producerService.updateProducerAsync(producer.id, {
        ...producer,
        avatarUrl: url,
      });

      if (updated) {
        setProducer(updated);
        updateUser(updated);

        activityLogService.logActivity({
          type: "profile.update",
          userId: updated.id,
          userNickname: updated.nickname,
          userAvatar: updated.avatarUrl,
          userRole: updated.role,
          description: `Updated profile avatar for '${updated.nickname}'`,
        });
        showToast("Profile picture updated!");
      }
    } catch {
      alert("Failed to upload avatar. Please try again.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Save Display Name
  const handleSaveNickname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!producer || !nicknameInput.trim() || isSavingNickname) return;
    setIsSavingNickname(true);
    try {
      const trimmed = nicknameInput.trim();
      const updated = await producerService.updateProducerAsync(producer.id, {
        ...producer,
        nickname: trimmed,
      });
      if (updated) {
        setProducer(updated);
        updateUser(updated);
        setIsEditingNickname(false);
        activityLogService.logActivity({
          type: "profile.update",
          userId: updated.id,
          userNickname: updated.nickname,
          userAvatar: updated.avatarUrl,
          userRole: updated.role,
          description: `Updated display name to '${updated.nickname}'`,
        });
        showToast("Display name updated!");
      }
    } catch {
      alert("Failed to update display name. Please try again.");
    } finally {
      setIsSavingNickname(false);
    }
  };

  // Save Profile URL Handle
  const handleSaveHandle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!producer || !handleInput.trim() || isSavingHandle) return;
    const clean = sanitizeHandle(handleInput);
    const valRes = validateHandle(clean);
    if (!valRes.isValid) {
      setHandleError(valRes.error || "Invalid handle");
      return;
    }
    if (!producerService.isHandleAvailable(clean, producer.id)) {
      setHandleError("This handle is already taken by another producer.");
      return;
    }
    setIsSavingHandle(true);
    try {
      const updated = await producerService.updateProducerAsync(producer.id, {
        ...producer,
        handle: clean,
      });
      if (updated) {
        setProducer(updated);
        updateUser(updated);
        setIsEditingHandle(false);
        setHandleError(null);
        router.replace(`/${clean}`);
        activityLogService.logActivity({
          type: "profile.update",
          userId: updated.id,
          userNickname: updated.nickname,
          userAvatar: updated.avatarUrl,
          userRole: updated.role,
          description: `Changed profile URL handle to @${clean}`,
        });
        showToast("Profile URL updated!");
      }
    } catch {
      alert("Failed to update profile URL handle. Please try again.");
    } finally {
      setIsSavingHandle(false);
    }
  };

  // Bio Inline Handlers
  const handleOpenBioEdit = () => {
    if (!producer) return;
    setBioInput(producer.bio || "");
    setIsEditingBio(true);
  };

  const handleSaveBio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!producer || isSavingBio) return;
    setIsSavingBio(true);
    try {
      const updated = await producerService.updateProducerAsync(producer.id, {
        ...producer,
        bio: bioInput.trim(),
      });
      if (updated) {
        setProducer(updated);
        updateUser(updated);
        setIsEditingBio(false);
        activityLogService.logActivity({
          type: "profile.update",
          userId: updated.id,
          userNickname: updated.nickname,
          userAvatar: updated.avatarUrl,
          userRole: updated.role,
          description: `Updated bio for '${updated.nickname}'`,
        });
        showToast("Bio updated!");
      }
    } catch {
      alert("Failed to update bio. Please try again.");
    } finally {
      setIsSavingBio(false);
    }
  };

  // Location Inline Handlers
  const handleOpenLocationEdit = () => {
    if (!producer) return;
    setLocationInput(producer.location || "");
    setIsEditingLocation(true);
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!producer || isSavingLocation) return;
    setIsSavingLocation(true);
    try {
      const updated = await producerService.updateProducerAsync(producer.id, {
        ...producer,
        location: locationInput.trim(),
      });
      if (updated) {
        setProducer(updated);
        updateUser(updated);
        setIsEditingLocation(false);
        activityLogService.logActivity({
          type: "profile.update",
          userId: updated.id,
          userNickname: updated.nickname,
          userAvatar: updated.avatarUrl,
          userRole: updated.role,
          description: `Updated location for '${updated.nickname}'`,
        });
        showToast("Location updated!");
      }
    } catch {
      alert("Failed to update location. Please try again.");
    } finally {
      setIsSavingLocation(false);
    }
  };

  // Social Links Modal Handlers
  const handleOpenSocialsModal = () => {
    if (!producer) return;
    setSocialsInput({
      instagram: producer.links?.instagram || "",
      facebook: producer.links?.facebook || "",
      youtube: producer.links?.youtube || "",
      spotify: producer.links?.spotify || "",
      bandcamp: producer.links?.bandcamp || "",
      soundcloud: producer.links?.soundcloud || "",
      beatstars: producer.links?.beatstars || "",
      website: producer.links?.website || "",
    });
    const isEmailShown = Boolean(
      producer.showEmail ??
      producer.links?.showEmail ??
      (producer.hideEmail === false && producer.links?.hideEmail === false)
    );
    setShowEmailInput(isEmailShown);
    setIsSocialsModalOpen(true);
  };

  const handleSaveSocials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!producer || isSavingSocials) return;
    setIsSavingSocials(true);
    try {
      const sanitizedSaveLinks: Record<string, string> = {};
      SOCIAL_PLATFORMS.forEach(({ key }) => {
        const val = socialsInput[key]?.trim() || "";
        if (val) {
          sanitizedSaveLinks[key] = normalizeUrl(val, key);
        }
      });

      const updated = await producerService.updateProducerAsync(producer.id, {
        ...producer,
        showEmail: showEmailInput,
        hideEmail: !showEmailInput,
        links: {
          ...sanitizedSaveLinks,
          showEmail: showEmailInput,
          hideEmail: !showEmailInput,
        },
      });

      if (updated) {
        setProducer(updated);
        updateUser(updated);
        setIsSocialsModalOpen(false);
        activityLogService.logActivity({
          type: "profile.update",
          userId: updated.id,
          userNickname: updated.nickname,
          userAvatar: updated.avatarUrl,
          userRole: updated.role,
          description: `Updated social links for '${updated.nickname}'`,
          metadata: {
            linksUpdated: Object.keys(sanitizedSaveLinks),
          },
        });
        showToast("Social links updated!");
      }
    } catch {
      alert("Failed to update social links. Please try again.");
    } finally {
      setIsSavingSocials(false);
    }
  };

  const isEmailVisible = Boolean(
    producer?.showEmail ??
    producer?.links?.showEmail ??
    (producer?.hideEmail === false && producer?.links?.hideEmail === false)
  );

  const KNOWN_PLATFORMS = useMemo(() => new Set(SOCIAL_PLATFORMS.map((p) => p.key.toLowerCase())), []);

  const activeLinks = useMemo(() => {
    if (!producer) return [];
    return (Object.entries(producer.links || {}) as [string, string | boolean][])
      .filter((entry): entry is [string, string] => {
        const [key, url] = entry;
        return (
          KNOWN_PLATFORMS.has(key.toLowerCase()) &&
          typeof url === "string" &&
          Boolean(url.trim())
        );
      })
      .sort(([a], [b]) => {
        const indexA = SOCIAL_PLATFORM_ORDER.indexOf(a.toLowerCase());
        const indexB = SOCIAL_PLATFORM_ORDER.indexOf(b.toLowerCase());
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
      });
  }, [producer?.links, KNOWN_PLATFORMS]);

  if (!hasChecked) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center animate-in fade-in duration-200">
        <Loader2 className="w-8 h-8 text-[#FF5E3A] animate-spin" />
      </div>
    );
  }

  if (!producer) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 space-y-4">
        <h1 className="text-3xl font-black text-[#FF5E3A]">404</h1>
        <h2 className="text-xl font-bold text-white">Producer Page Not Found</h2>
        <p className="text-xs text-zinc-400 max-w-sm">
          No producer exists with handle or ID <span className="text-white font-mono">@{producerId}</span>.
        </p>
        <Link
          href="/beats"
          className="px-6 py-2.5 rounded-full bg-[#FF5E3A] hover:bg-[#FF4520] text-white text-xs font-bold transition-all inline-flex items-center gap-2 shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Explore All Beats</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-12 animate-in fade-in duration-300">
      
      {/* SECTION 1: PRODUCER HERO / IDENTITY */}
      <div className="relative">
        <div className="flex flex-col md:flex-row items-start md:items-start justify-between gap-6 sm:gap-8">
          
          {/* Avatar with Owner Hover Change Overlay */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden relative shrink-0 bg-[#121212] shadow-inner group">
            <Image
              src={
                producer.avatarUrl && !producer.avatarUrl.includes("supabase.co/storage")
                  ? producer.avatarUrl
                  : "/avatars/default-avatar.png"
              }
              alt={producer.nickname}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 96px, 112px"
              priority
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                if (img && !img.src.endsWith("/avatars/default-avatar.png")) {
                  img.src = "/avatars/default-avatar.png";
                }
              }}
            />
            {isProfileOwner && (
              <Tooltip content="Change profile picture" className="w-full h-full">
                <label
                  className="w-full h-full bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-white text-[11px] font-bold gap-1"
                >
                  <Pencil className="w-4 h-4 text-white" />
                  <span>Change</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />
                </label>
              </Tooltip>
            )}
            {isUploadingAvatar && (
              <div className="absolute inset-0 bg-black/75 flex items-center justify-center z-10">
                <Loader2 className="w-5 h-5 text-[#7B61FF] animate-spin" />
              </div>
            )}
          </div>

          {/* Producer Info & Bio */}
          <div className="flex-1 space-y-2.5">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                {isEditingNickname ? (
                  <form onSubmit={handleSaveNickname} className="h-8 inline-flex items-center gap-2">
                    <input
                      type="text"
                      value={nicknameInput}
                      onChange={(e) => setNicknameInput(e.target.value)}
                      style={{ width: `${Math.max(nicknameInput.length, 1)}ch` }}
                      className="bg-transparent text-2xl font-bold text-white tracking-tight p-0 m-0 border-0 outline-none border-b border-[#7B61FF]/60 rounded-none focus:outline-none focus:border-[#7B61FF] h-8 leading-8"
                      autoFocus
                      required
                    />
                    <div className="inline-flex items-center gap-1">
                      <Tooltip content="Save name">
                        <button
                          type="submit"
                          disabled={isSavingNickname || !nicknameInput.trim()}
                          className="p-1 -m-1 text-emerald-400 hover:text-emerald-300 disabled:opacity-40 cursor-pointer"
                        >
                          {isSavingNickname ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                      </Tooltip>
                      <Tooltip content="Cancel">
                        <button
                          type="button"
                          onClick={() => setIsEditingNickname(false)}
                          className="p-1 -m-1 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    </div>
                  </form>
                ) : (
                  <div className="h-8 flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-white tracking-tight h-8 leading-8 flex items-center">
                      {producer.nickname}
                    </h1>
                    {isProfileOwner && (
                      <Tooltip content="Edit display name">
                        <button
                          type="button"
                          onClick={() => {
                            setNicknameInput(producer.nickname);
                            setIsEditingNickname(true);
                          }}
                          className="p-1 -m-1 text-zinc-400 hover:text-white transition-all cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                )}

                {/* Sorted Priority Badges */}
                {sortedBadges.map((role) => {
                  const lower = role.toLowerCase();
                  let badgeClass = "bg-[#1E1E1E] text-[#888888]";
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
                      className={`px-3 py-1 rounded-full text-xs font-medium ${badgeClass}`}
                    >
                      {role}
                    </span>
                  );
                })}
              </div>

              {/* Handle row: beatsandpieces.ro/nerub (Click to copy + Edit button) */}
              <div className="flex items-center gap-2 min-h-[18px]">
                {isEditingHandle ? (
                  <form onSubmit={handleSaveHandle} className="inline-flex items-center relative leading-none">
                    <span className="text-xs text-[#888888] font-normal select-none leading-none">
                      beatsandpieces.ro/
                    </span>
                    <input
                      type="text"
                      value={handleInput}
                      onChange={(e) => {
                        const val = sanitizeHandle(e.target.value);
                        setHandleInput(val);
                        if (val) {
                          const res = validateHandle(val);
                          if (!res.isValid) {
                            setHandleError(res.error || "Invalid handle");
                          } else if (!producerService.isHandleAvailable(val, producer.id)) {
                            setHandleError("This handle is already taken.");
                          } else {
                            setHandleError(null);
                          }
                        } else {
                          setHandleError("Handle cannot be empty.");
                        }
                      }}
                      style={{ width: `${Math.max(handleInput.length, 1)}ch` }}
                      className="bg-transparent text-xs text-white font-medium p-0 m-0 border-0 outline-none border-b border-[#7B61FF]/60 rounded-none focus:outline-none focus:border-[#7B61FF] leading-none lowercase h-[14px]"
                      autoFocus
                      required
                    />
                    <div className="inline-flex items-center gap-1.5 ml-2">
                      <Tooltip content="Save URL">
                        <button
                          type="submit"
                          disabled={isSavingHandle || Boolean(handleError) || !handleInput.trim()}
                          className="p-1 -m-1 text-emerald-400 hover:text-emerald-300 disabled:opacity-40 cursor-pointer"
                        >
                          {isSavingHandle ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        </button>
                      </Tooltip>
                      <Tooltip content="Cancel">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingHandle(false);
                            setHandleError(null);
                          }}
                          className="p-1 -m-1 text-[#888888] hover:text-white cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Tooltip>
                    </div>

                    {handleError && (
                      <div className="absolute top-full left-0 mt-1 z-20 text-[11px] text-[#FF5E3A] font-medium whitespace-nowrap bg-[#181818] px-2 py-0.5 rounded shadow-lg">
                        {handleError}
                      </div>
                    )}
                  </form>
                ) : (
                  <div className="flex items-center gap-2 leading-none">
                    <div className="relative inline-flex items-center">
                      <Tooltip content="Click to copy profile URL">
                        <button
                          type="button"
                          onClick={handleShareProfile}
                          className="text-xs text-[#888888] hover:text-zinc-200 font-normal transition-colors cursor-pointer text-left leading-none flex items-center gap-1.5"
                        >
                          <span>
                            <span>beatsandpieces.ro/</span>
                            <span className="text-white font-medium">{producer.handle || producer.id}</span>
                          </span>
                        </button>
                      </Tooltip>

                      {copiedShareLink && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-[#222222] text-white text-[11px] font-bold rounded-full shadow-2xl whitespace-nowrap z-50 flex items-center gap-1.5 leading-none pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>Profile link copied!</span>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#222222]" />
                        </div>
                      )}
                    </div>

                    {/* Edit URL Handle Button (Owner Only - permanently visible) */}
                    {isProfileOwner && (
                      <Tooltip content="Edit profile URL">
                        <button
                          type="button"
                          onClick={() => {
                            setHandleInput(producer.handle || producer.id);
                            setHandleError(null);
                            setIsEditingHandle(true);
                          }}
                          className="p-1 -m-1 text-[#888888] hover:text-white transition-all cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Location Inline Edit / Display */}
            {isEditingLocation ? (
              <form onSubmit={handleSaveLocation} className="inline-flex items-center gap-1.5 text-xs text-[#888888] h-4 leading-4 max-w-md">
                <MapPin className="w-3.5 h-3.5 text-[#888888] shrink-0" />
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="e.g. Bucharest, Romania"
                  className="bg-transparent text-xs text-white p-0 m-0 border-0 outline-none border-b border-[#7B61FF]/60 rounded-none focus:outline-none focus:border-[#7B61FF] h-4 leading-4 placeholder:text-[#666666]"
                  autoFocus
                />
                <div className="inline-flex items-center gap-1 ml-1">
                  <Tooltip content="Save location">
                    <button
                      type="submit"
                      disabled={isSavingLocation}
                      className="p-1 -m-1 text-emerald-400 hover:text-emerald-300 disabled:opacity-40 cursor-pointer"
                    >
                      {isSavingLocation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                  </Tooltip>
                  <Tooltip content="Cancel">
                    <button
                      type="button"
                      onClick={() => setIsEditingLocation(false)}
                      className="p-1 -m-1 text-[#888888] hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#888888] min-h-[16px]">
                {producer.location ? (
                  <span className="flex items-center gap-1.5 h-4 leading-4">
                    <MapPin className="w-3.5 h-3.5 text-[#888888] shrink-0" />
                    <span className="h-4 leading-4 text-[#888888]">{producer.location}</span>
                    {isProfileOwner && (
                      <Tooltip content="Edit location">
                        <button
                          type="button"
                          onClick={handleOpenLocationEdit}
                          className="p-1 -m-1 text-[#888888] hover:text-white transition-all cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    )}
                  </span>
                ) : isProfileOwner ? (
                  <button
                    onClick={handleOpenLocationEdit}
                    className="text-xs text-[#888888] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer h-4 leading-4"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#888888] shrink-0" />
                    <span>Add location</span>
                  </button>
                ) : null}
              </div>
            )}

            {/* Bio Inline Edit / Display */}
            {isEditingBio ? (
              <form onSubmit={handleSaveBio} className="space-y-1.5 max-w-2xl">
                <div className="flex items-start gap-2">
                  <textarea
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    placeholder="Tell the community about yourself"
                    rows={3}
                    className="w-full bg-transparent p-0 m-0 text-sm sm:text-base text-white leading-relaxed border-0 outline-none border-b border-[#7B61FF]/60 rounded-none focus:outline-none focus:border-[#7B61FF] resize-none placeholder:text-[#666666] block"
                    autoFocus
                  />
                  <div className="inline-flex items-center gap-1 shrink-0 mt-0.5">
                    <Tooltip content="Save bio">
                      <button
                        type="submit"
                        disabled={isSavingBio}
                        className="p-1 -m-1 text-emerald-400 hover:text-emerald-300 disabled:opacity-40 cursor-pointer"
                      >
                        {isSavingBio ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      </button>
                    </Tooltip>
                    <Tooltip content="Cancel">
                      <button
                        type="button"
                        onClick={() => setIsEditingBio(false)}
                        className="p-1 -m-1 text-[#888888] hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </form>
            ) : (
              <div>
                {producer.bio ? (
                  <div className="flex items-start gap-2">
                    <p className="text-sm sm:text-base text-white leading-relaxed max-w-2xl font-normal">
                      {producer.bio}
                    </p>
                    {isProfileOwner && (
                      <Tooltip content="Edit bio">
                        <button
                          type="button"
                          onClick={handleOpenBioEdit}
                          className="p-1 -m-1 text-[#888888] hover:text-white transition-all cursor-pointer shrink-0 mt-0.5"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                ) : isProfileOwner ? (
                  <button
                    onClick={handleOpenBioEdit}
                    className="text-xs text-[#888888] hover:text-white flex items-center gap-1 py-0.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add bio</span>
                  </button>
                ) : null}
              </div>
            )}

            {/* Clickable Social Icons (Including Email at end if enabled & Edit Socials button) */}
            {((Boolean(producer.email) && isEmailVisible) || activeLinks.length > 0 || isProfileOwner) && (
              <div className="flex flex-wrap items-center gap-4 pt-1 text-[#888888]">
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
                  const formattedUrl = normalizeUrl(url, platform);
                  const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1);

                  return (
                    <Tooltip key={platform} content={`${platformLabel}: ${url}`}>
                      <a
                        href={formattedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`p-2 -m-2 inline-flex items-center justify-center text-zinc-400 ${hoverColor} transition-colors duration-200 active:scale-95 cursor-pointer`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </a>
                    </Tooltip>
                  );
                })}

                {/* Email Icon at the end */}
                {Boolean(producer.email) && isEmailVisible && (
                  <div className="relative inline-flex items-center">
                    <Tooltip content={`Copy email (${producer.email})`}>
                      <button
                        type="button"
                        onClick={handleCopyEmail}
                        className="p-2 -m-2 inline-flex items-center justify-center text-zinc-400 hover:text-white transition-colors duration-200 active:scale-95 cursor-pointer"
                        aria-label="Copy Email"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    </Tooltip>

                    {emailCopiedTooltip && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 px-3.5 py-1.5 bg-[#222222] text-white text-xs font-bold rounded-full shadow-2xl whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 z-50 flex items-center justify-center gap-1.5 leading-none pointer-events-none">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>E-mail copied to clipboard!</span>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#222222]" />
                      </div>
                    )}
                  </div>
                )}

                {/* Edit Social Links Trigger Button (Owner Only) */}
                {isProfileOwner && (
                  <Tooltip content="Edit social links and email privacy">
                    <button
                      type="button"
                      onClick={handleOpenSocialsModal}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>{activeLinks.length > 0 ? "Edit Links" : "Add Links"}</span>
                    </button>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: PRODUCER BEATS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">Beats</h2>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Sorting Dropdown Button (Sits to the left of Add Beat) */}
            {prioritizedBeats.length > 0 && (
              <div className="relative" ref={sortMenuRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsSortOpen((prev) => !prev);
                  }}
                  className="h-9 px-3 sm:px-3.5 rounded-xl bg-[#181818] hover:bg-[#222222] text-xs font-bold text-white transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  title="Sort beats"
                  aria-label="Sort beats"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="whitespace-nowrap">{sortLabelMap[beatsSortBy]}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 shrink-0 ${isSortOpen ? "rotate-180" : ""}`} />
                </button>

                {isSortOpen && (
                  <div className="absolute right-0 top-full mt-2 w-44 bg-[#181818] rounded-2xl p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 border-none">
                    {(["recent", "rating"] as const).map((key) => {
                      const isSelected = beatsSortBy === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setBeatsSortBy(key);
                            setIsSortOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-brand text-white shadow-sm"
                              : "text-zinc-400 hover:text-white hover:bg-[#222222]"
                          }`}
                        >
                          <span>{sortLabelMap[key]}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Add Beat Button */}
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
                className={`h-9 px-3.5 sm:px-4 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 shrink-0 ${
                  isAtBeatLimit
                    ? "bg-[#222222] text-zinc-500 cursor-not-allowed"
                    : "bg-[#7B61FF] hover:bg-[#684DE6] text-white active:scale-95 cursor-pointer"
                }`}
                title={isAtBeatLimit ? `Limit of ${MAX_FREE_BEATS} beats reached` : "Add Beat"}
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Add Beat</span>
              </button>
            )}
          </div>
        </div>

        {/* Max Upload Limit Notice */}
        {isProfileOwner && isAtBeatLimit && (
          <div className="bg-[#1C1A24] rounded-3xl p-4 flex items-center gap-3.5 text-xs text-zinc-300 animate-in fade-in duration-200">
            <div className="w-8 h-8 rounded-3xl bg-[#7B61FF]/15 flex items-center justify-center shrink-0 text-[#7B61FF]">
              <Music className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white">Maximum upload limit reached ({MAX_FREE_BEATS}/{MAX_FREE_BEATS}).</p>
              <p className="text-[#888888] mt-0.5">
                To upload a new beat, you can remove an existing one. Unlocking more slots will be possible in future versions of the platform.
              </p>
            </div>
          </div>
        )}

        {displayedBeats.length > 0 ? (
          <div className="space-y-4">
            {displayedBeats.map((beat) => (
              <div
                key={beat.id}
                className="bg-[#181818] rounded-[28px] p-4 space-y-3 shadow-md group relative"
              >
                {/* Row 1: Header (Title, Rank Badge, Meta, Edit Action) */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 min-w-0">
                  
                  {/* Left: Beat Title + Quick Link Badge + Rank Badge */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-14 sm:pr-0">
                    <div className="min-w-0 flex-1">
                      {/* Title & Desktop Inline Badges */}
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <h3 className="font-bold text-white text-lg leading-snug break-words [overflow-wrap:anywhere]">
                          {beat.title}
                        </h3>

                        {/* Desktop Inline Badges */}
                        <div className="hidden sm:inline-flex items-center gap-2">
                          {beat.rank === 1 && (
                            <span className="h-6 px-3.5 rounded-full bg-[#FF5E3A]/20 text-[#FF5E3A] text-xs font-bold inline-flex items-center justify-center text-center leading-none select-none shrink-0">
                              1st Place
                            </span>
                          )}
                          {beat.rank === 2 && (
                            <span className="h-6 px-3.5 rounded-full bg-[#1E1E1E] text-[#AAAAAA] text-xs font-bold inline-flex items-center justify-center text-center leading-none select-none shrink-0">
                              2nd Place
                            </span>
                          )}
                          {beat.rank === 3 && (
                            <span className="h-6 px-3.5 rounded-full bg-[#FF5E3A]/10 text-[#FF8A65] text-xs font-bold inline-flex items-center justify-center text-center leading-none select-none shrink-0">
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
                                className="px-3.5 py-1.5 rounded-full bg-[#7B61FF]/15 text-zinc-300 hover:bg-[#7B61FF]/25 hover:text-white text-xs font-bold shrink-0 transition-all inline-flex items-center gap-1 leading-none"
                                title={`View ${beat.battleSource || `Beat Battle #${match[1]}`}`}
                              >
                                <span>{battleLabel}</span>
                                <span className="text-xs">↗</span>
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
                              <span className="h-6 px-3.5 rounded-full bg-[#FF5E3A]/20 text-[#FF5E3A] text-xs font-bold inline-flex items-center justify-center text-center leading-none select-none shrink-0">
                                1st Place
                              </span>
                            )}
                            {beat.rank === 2 && (
                              <span className="h-6 px-3.5 rounded-full bg-[#1E1E1E] text-[#AAAAAA] text-xs font-bold inline-flex items-center justify-center text-center leading-none select-none shrink-0">
                                2nd Place
                              </span>
                            )}
                            {beat.rank === 3 && (
                              <span className="h-6 px-3.5 rounded-full bg-[#FF5E3A]/10 text-[#FF8A65] text-xs font-bold inline-flex items-center justify-center text-center leading-none select-none shrink-0">
                                3rd Place
                              </span>
                            )}

                            {match && (
                              <Link
                                href={`/battles/battle-${match[1]}`}
                                className="px-3.5 py-1.5 rounded-full bg-[#7B61FF]/15 text-zinc-300 hover:bg-[#7B61FF]/25 hover:text-white text-xs font-bold shrink-0 transition-all inline-flex items-center gap-1 select-none leading-none"
                                title={`View ${beat.battleSource || `Beat Battle #${match[1]}`}`}
                              >
                                <span>BB#{match[1]}</span>
                                <span className="text-xs">↗</span>
                              </Link>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Right: BPM, Price Tag, Edit Button */}
                  <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 self-start select-none">
                    {beat.bpm ? (
                      <span className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-[#121212] text-[#888888] select-none inline-flex items-center justify-center text-center leading-none">
                        {beat.bpm} BPM
                      </span>
                    ) : null}

                    {beat.priceTag ? (
                      <span
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold select-none inline-flex items-center justify-center text-center leading-none ${
                          beat.priceTag === "Not For Sale"
                            ? "bg-[#121212] text-[#666666]"
                            : "bg-emerald-500/20 text-emerald-400"
                        }`}
                      >
                        {beat.priceTag}
                      </span>
                    ) : null}

                    {/* Jury Score Avg */}
                    {typeof beat.juryScore === "number" && beat.juryScore > 0 ? (
                      <Tooltip content="Jury Score Average">
                        <div className="flex items-center gap-1 text-xs text-[#7B61FF] font-bold px-1.5 select-none cursor-default">
                          <Star className="w-4 h-4 fill-current text-[#7B61FF]" />
                          <span>{beat.juryScore.toFixed(2)}</span>
                        </div>
                      </Tooltip>
                    ) : null}

                    {/* Top Right Corner Actions (Absolute on mobile, inline on desktop) */}
                    <div className="absolute top-4 right-4 sm:static sm:top-auto sm:right-auto z-10 flex items-center gap-3">
                      {/* Edit Beat Button (Profile Owner only) */}
                      {isProfileOwner && (
                        <Tooltip content="Edit beat details">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(beat)}
                            className="p-1.5 rounded-full bg-[#7B61FF]/15 hover:bg-[#7B61FF]/25 text-[#7B61FF] hover:text-white transition-colors cursor-pointer select-none"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                      )}

                      {/* Public Rating Average */}
                      {typeof beat.flames === "number" && beat.flames >= 1 ? (
                        <Tooltip content="Public Rating Average">
                          <div className="flex items-center gap-1 text-xs text-[#FF5E3A] font-bold select-none cursor-default leading-none">
                            <Flame className="w-4 h-4 fill-current" />
                            <span>{beat.flames.toFixed(2)}</span>
                          </div>
                        </Tooltip>
                      ) : null}
                    </div>
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
                        className="px-3.5 py-1.5 rounded-full bg-[#121212] text-[#888888] text-xs font-bold select-none inline-flex items-center justify-center text-center leading-none"
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
          <div className="bg-[#181818] rounded-[28px] p-8 text-center space-y-2">
            <p className="text-zinc-400 text-sm">
              This producer hasn&apos;t submitted any beats.
            </p>
          </div>
        )}
      </div>

      {/* SECTION 3: FEATURED VAULT MEDIA */}
      {producerVaultItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">
              Featured In Vault
            </h2>
            <Link
              href="/vault"
              className="text-xs text-zinc-400 hover:text-[#7B61FF] font-bold transition-colors"
            >
              Explore Vault →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {producerVaultItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveVaultModalItem(item)}
                className="bg-[#181818] hover:bg-[#222222] p-4 rounded-3xl flex items-center gap-4 transition-colors group shadow-md cursor-pointer select-none"
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
                  <span className="text-xs font-bold uppercase tracking-wider text-[#7B61FF] block">
                    {item.category === "breakdowns" ? "Beat Breakdown" : "Live Set"}
                  </span>
                  <h4 className="text-lg font-bold text-white truncate">
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
      <ClientPortal>
        {editingBeat && (
          <div
            onMouseDown={handleBackdropMouseDown}
            onMouseUp={(e) => handleBackdropMouseUp(e, () => setEditingBeat(null))}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
          >
            <div
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#181818] rounded-[28px] max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative cursor-default max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              {/* Header Title & Close Button */}
              <div className="flex items-center justify-between pb-1">
                <h3 className="text-2xl font-bold text-white">Edit Beat</h3>
                <button
                  type="button"
                  onClick={() => setEditingBeat(null)}
                  className="w-9 h-9 rounded-full bg-[#121212] text-zinc-400 hover:text-white flex items-center justify-center text-sm cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Two-Column Responsive Configuration Form */}
              <form onSubmit={handleSaveEditBeat} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Title, BPM, Availability, & Tags */}
                  <div className="lg:col-span-6 space-y-5">
                    {/* Beat Title */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-white flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span>Beat Title</span>
                          <span className="text-[#FF5E3A]">*</span>
                        </div>
                      </label>
                      <input
                        type="text"
                        value={editingBeat.title}
                        onChange={(e) =>
                          setEditingBeat({ ...editingBeat, title: e.target.value })
                        }
                        placeholder="e.g. Midnight Heat"
                        className="w-full bg-[#121212] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#7B61FF] transition-all"
                        required
                      />
                      <p className="text-xs text-[#888888]">
                        Only the track title is needed, your name is displayed automatically.
                      </p>
                    </div>

                    {/* BPM (Optional) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-white">
                        BPM
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 90 (optional)"
                        value={editingBeat.bpm}
                        onChange={(e) =>
                          setEditingBeat({ ...editingBeat, bpm: e.target.value === "" ? "" : Number(e.target.value) })
                        }
                        className="w-full bg-[#121212] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#7B61FF] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
                      />
                    </div>

                    {/* Availability */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white">
                        Availability
                      </label>
                      <div className="grid grid-cols-2 gap-1 bg-[#121212] p-1 rounded-xl h-[48px] items-center">
                        <button
                          type="button"
                          onClick={() => setEditingBeat({ ...editingBeat, isForSale: true })}
                          className={`h-full rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                            editingBeat.isForSale
                              ? "bg-[#7B61FF] text-white shadow-sm"
                              : "text-zinc-400 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          For Sale
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingBeat({ ...editingBeat, isForSale: false })}
                          className={`h-full rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                            !editingBeat.isForSale
                              ? "bg-[#7B61FF] text-white shadow-sm"
                              : "text-zinc-400 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          Not For Sale
                        </button>
                      </div>
                    </div>

                    {/* Preset Standard Tags Selector */}
                    <StandardTagSelector
                      selectedTags={editingTags}
                      onChange={setEditingTags}
                    />
                  </div>

                  {/* Right Column: Audio File & Waveform Preview */}
                  <div className="lg:col-span-6 space-y-2">
                    <label className="text-xs font-bold text-white flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span>Audio File</span>
                        <span className="text-[#FF5E3A]">*</span>
                      </div>
                      {editingBeat.isBattleSubmission && (
                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      )}
                    </label>

                    {isUploadingBeatAudio ? (
                      <div className="bg-[#121212] p-6 rounded-xl min-h-[220px] flex flex-col items-center justify-center text-center gap-3 border-2 border-dashed border-[#7B61FF]/40">
                        <div className="w-8 h-8 border-2 border-[#7B61FF] border-t-transparent rounded-full animate-spin" />
                        <p className="text-lg font-bold text-white">
                          Uploading...
                        </p>
                      </div>
                    ) : (
                      <div className="bg-[#121212] p-5 rounded-xl space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-white text-lg font-bold truncate">
                            <Music className="w-4 h-4 text-[#7B61FF] shrink-0" />
                            <span className="truncate">{editingBeat.audioUrl.split("/").pop() || "Audio File"}</span>
                          </div>
                          {!editingBeat.isBattleSubmission && (
                            <label className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-[#1C1C1C] hover:bg-[#252525] text-zinc-300 hover:text-white transition-all cursor-pointer shrink-0">
                              <span>Replace</span>
                              <input
                                type="file"
                                accept="audio/*"
                                onChange={(e) => handleAudioUpload(e, false)}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>

                        <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                          <AudioWaveformPlayer
                            id={`profile-edit-beat-${editingBeat.id}`}
                            title={editingBeat.title || "Preview"}
                            artist={producer.nickname}
                            audioUrl={editingBeat.audioUrl}
                            duration={editingBeat.duration}
                            waveformPeaks={editingBeat.waveform}
                            compact={true}
                          />
                        </div>
                      </div>
                    )}

                    {/* Battle submission notice if applicable */}
                    {editingBeat.isBattleSubmission && (
                      <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-300 text-xs flex items-start gap-2.5 leading-relaxed mt-3">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <p>
                          This beat is part of a historical battle archive ({((editingBeat.battleSource || "Beat Battle").replace(/\s*\([^)]*\)/g, "")).trim()}). The <strong>Audio Master</strong> cannot be changed or deleted to preserve competition records.
                        </p>
                      </div>
                    )}
                  </div>

                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between gap-3 pt-3">
                  {!editingBeat.isBattleSubmission ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteBeat(editingBeat.id)}
                      className="px-6 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Beat</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  <button
                    type="submit"
                    disabled={isUploadingBeatAudio || !editingBeat.title.trim()}
                    className="px-8 py-3 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center whitespace-nowrap ml-auto"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </ClientPortal>

      {/* ADD BEAT MODAL */}
      <ClientPortal>
        {isAddModalOpen && (
          <div
            onMouseDown={handleBackdropMouseDown}
            onMouseUp={(e) => handleBackdropMouseUp(e, () => {
              setIsAddModalOpen(false);
              setStagedNewBeatFile(null);
              setNewBeatAudioUrl("");
              setNewBeatAudioName("");
            })}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
          >
            <div
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#181818] rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative cursor-default max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              {/* Header Title & Close Button */}
              <div className="flex items-center justify-between pb-1">
                <h3 className="text-2xl font-bold text-white">Add Beat</h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setStagedNewBeatFile(null);
                    setNewBeatAudioUrl("");
                    setNewBeatAudioName("");
                    setNewBeatBpm("");
                  }}
                  className="w-9 h-9 rounded-full bg-[#121212] text-zinc-400 hover:text-white flex items-center justify-center text-sm cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Two-Column Responsive Upload & Configuration Form */}
              <form onSubmit={handleCreateBeat} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Title, BPM, Availability, & Tags */}
                  <div className="lg:col-span-6 space-y-5">
                    {/* Beat Title */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-white flex items-center gap-1">
                        <span>Beat Title</span>
                        <span className="text-[#FF5E3A]">*</span>
                      </label>
                      <input
                        type="text"
                        value={newBeatTitle}
                        onChange={(e) => setNewBeatTitle(e.target.value)}
                        placeholder="e.g. Midnight Heat"
                        className="w-full bg-[#121212] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#7B61FF] transition-all"
                        required
                      />
                      <p className="text-xs text-[#888888]">
                        Only the track title is needed, your name is displayed automatically.
                      </p>
                    </div>

                    {/* BPM (Optional) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-white">
                        BPM
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 90 (optional)"
                        value={newBeatBpm}
                        onChange={(e) =>
                          setNewBeatBpm(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        className="w-full bg-[#121212] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#7B61FF] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
                      />
                    </div>

                    {/* Availability */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white">
                        Availability
                      </label>
                      <div className="grid grid-cols-2 gap-1 bg-[#121212] p-1 rounded-xl h-[48px] items-center">
                        <button
                          type="button"
                          onClick={() => setNewBeatIsForSale(true)}
                          className={`h-full rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                            newBeatIsForSale
                              ? "bg-[#7B61FF] text-white shadow-sm"
                              : "text-zinc-400 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          For Sale
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewBeatIsForSale(false)}
                          className={`h-full rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                            !newBeatIsForSale
                              ? "bg-[#7B61FF] text-white shadow-sm"
                              : "text-zinc-400 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          Not For Sale
                        </button>
                      </div>
                    </div>

                    {/* Preset Standard Tags Selector */}
                    <StandardTagSelector
                      selectedTags={newBeatTags}
                      onChange={setNewBeatTags}
                    />
                  </div>

                  {/* Right Column: Audio Drag & Drop & Live Preview */}
                  <div className="lg:col-span-6 space-y-2">
                    <label className="text-xs font-bold text-white flex items-center gap-1">
                      <span>Audio File</span>
                      <span className="text-[#FF5E3A]">*</span>
                    </label>

                    {isUploadingBeatAudio ? (
                      <div className="bg-[#121212] p-6 rounded-xl min-h-[220px] flex flex-col items-center justify-center text-center gap-3 border-2 border-dashed border-[#7B61FF]/40">
                        <div className="w-8 h-8 border-2 border-[#7B61FF] border-t-transparent rounded-full animate-spin" />
                        <p className="text-lg font-bold text-white">
                          Uploading...
                        </p>
                      </div>
                    ) : stagedNewBeatFile || newBeatAudioUrl ? (
                      <div className="bg-[#121212] p-5 rounded-xl space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-white text-lg font-bold truncate">
                            <Music className="w-4 h-4 text-[#7B61FF] shrink-0" />
                            <span className="truncate">{newBeatAudioName || "Audio Staged"}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setStagedNewBeatFile(null);
                              setNewBeatAudioUrl("");
                              setNewBeatAudioName("");
                              setNewBeatWaveformPeaks([]);
                              setNewBeatDuration(0);
                            }}
                            className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-[#1C1C1C] hover:bg-red-500/20 text-zinc-300 hover:text-red-400 transition-all cursor-pointer shrink-0"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                          <AudioWaveformPlayer
                            id="profile-new-beat-preview"
                            title={newBeatTitle || "Preview"}
                            artist={producer.nickname}
                            audioUrl={newBeatAudioUrl}
                            duration={newBeatDuration}
                            waveformPeaks={newBeatWaveformPeaks}
                            compact={true}
                          />
                        </div>
                      </div>
                    ) : (
                      <label
                        onDragOver={handleNewBeatDragOver}
                        onDragEnter={handleNewBeatDragOver}
                        onDragLeave={handleNewBeatDragLeave}
                        onDrop={handleNewBeatDrop}
                        className={`min-h-[220px] rounded-xl p-7 flex flex-col items-center justify-center text-center gap-3 transition-all cursor-pointer border-2 border-dashed border-[#7B61FF] ${
                          isDraggingNewBeat
                            ? "bg-[#7B61FF]/15 border-solid scale-[1.01]"
                            : "bg-[#121212]/70 hover:bg-[#121212]"
                        }`}
                      >
                        <div className="w-12 h-12 rounded-full bg-[#7B61FF]/15 flex items-center justify-center text-[#7B61FF]">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-lg font-bold text-white">
                            Drag & drop your beat audio file here
                          </p>
                          <p className="text-xs text-zinc-400">
                            or <span className="text-[#7B61FF] underline underline-offset-2">browse files</span> from your device
                          </p>
                        </div>
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={(e) => handleAudioUpload(e, true)}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-end pt-3">
                  <button
                    type="submit"
                    disabled={isUploadingBeatAudio || (!stagedNewBeatFile && !newBeatAudioUrl) || !newBeatTitle.trim()}
                    className="px-8 py-3 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {isUploadingBeatAudio ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <span>Finish</span>
                    )}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}
      </ClientPortal>

      {/* Custom Beat Deletion Confirmation Modal */}
      <ClientPortal>
        {beatToDelete && (
          <div
            className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={() => setBeatToDelete(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#181818] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Delete Beat</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">This action cannot be undone.</p>
                </div>
              </div>

              <p className="text-sm text-zinc-300">
                Are you sure you want to permanently delete <span className="text-white font-semibold">"{beatToDelete.title}"</span> from your showcase?
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setBeatToDelete(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (beatToDelete) {
                      beatService.deleteBeat(beatToDelete.id, {
                        id: authUser?.id || producer?.id,
                        nickname: authUser?.nickname || producer?.nickname,
                        avatarUrl: authUser?.avatarUrl || producer?.avatarUrl,
                        role: authUser?.role || producer?.role,
                      });
                      setBeatToDelete(null);
                      setEditingBeat(null);
                      setBeatsVersion((v) => v + 1);
                      showToast("Beat deleted");
                    }
                  }}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Delete Beat
                </button>
              </div>
            </div>
          </div>
        )}
      </ClientPortal>

      {/* Floating Save Toast Pop-up Notification */}
      <ClientPortal>
        {saveToastMessage && (
          <div className="fixed bottom-6 right-6 z-[210] bg-[#181818] text-white px-5 py-3.5 rounded-3xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 backdrop-blur-md">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Notification</p>
              <p className="text-xs text-zinc-400">{saveToastMessage}</p>
            </div>
          </div>
        )}
      </ClientPortal>

      {/* IN-APP VAULT VIDEO MODAL */}
      <ClientPortal>
        {activeVaultModalItem && (
          <div
            onClick={() => setActiveVaultModalItem(null)}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#181818] rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl space-y-4 p-4 sm:p-6 relative cursor-default"
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
                  className="px-4 py-2 rounded-xl bg-[#222222] hover:bg-[#2c2c2c] text-white font-bold flex items-center gap-2 shrink-0 transition-colors"
                >
                  <span>Watch on YouTube</span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                </a>
              </div>
            </div>
          </div>
        )}
      </ClientPortal>

      {/* SOCIAL LINKS MODAL */}
      {isSocialsModalOpen && (
        <ClientPortal>
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#181818] rounded-[24px] p-6 sm:p-8 w-full max-w-xl max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Socials & Links</h2>
                  <p className="text-xs text-[#888888]">
                    Connect your portfolio, stream links, and social platforms.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSocialsModalOpen(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveSocials} className="space-y-4">
                <div className="space-y-3">
                  {SOCIAL_PLATFORMS.map(({ key, label, placeholder }) => (
                    <div key={key} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
                      <label className="sm:col-span-3 text-xs font-bold text-[#D1D1D1]">
                        {label}
                      </label>
                      <div className="sm:col-span-9">
                        <input
                          type="text"
                          value={socialsInput[key] || ""}
                          onChange={(e) => setSocialsInput({ ...socialsInput, [key]: e.target.value })}
                          placeholder={placeholder}
                          className="w-full bg-[#121212] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-white/25 placeholder:font-normal focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Email Privacy - Toggle Pillbox */}
                <div className="pt-2">
                  <div className="flex items-center justify-between bg-[#121212] p-4 rounded-2xl">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-white">Show email on public profile</p>
                      <p className="text-[11px] text-[#888888]">
                        When enabled, visitors can see and copy your contact email.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showEmailInput}
                      onClick={() => setShowEmailInput(!showEmailInput)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                        showEmailInput ? "bg-[#7B61FF]" : "bg-[#262626]"
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                          showEmailInput ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSocialsModalOpen(false)}
                    className="px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingSocials}
                    className="px-6 py-2.5 rounded-full bg-[#7B61FF] hover:bg-[#684DE6] text-white text-xs font-bold transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSavingSocials && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ClientPortal>
      )}

      {/* Interactive Profile Picture Cropper Modal */}
      <ImageCropperModal
        isOpen={isCropperOpen}
        imageSrc={cropperSrc || ""}
        onClose={() => setIsCropperOpen(false)}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
