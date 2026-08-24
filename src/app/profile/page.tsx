"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Image from "next/image";
import { UserProfile } from "@/lib/types";
import { X, ShieldCheck, Sparkles, CheckCircle2, Camera } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { producerService, storageService } from "@/services";
import { useRouter, useSearchParams } from "next/navigation";
import { ClientPortal } from "@/components/ClientPortal";

import { normalizeUrl } from "@/lib/utils";

const SOCIAL_PLATFORMS = [
  { key: "website", label: "Website" },
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "youtube", label: "YouTube" },
  { key: "spotify", label: "Spotify" },
  { key: "bandcamp", label: "Bandcamp" },
  { key: "beatstars", label: "BeatStars" },
  { key: "soundcloud", label: "SoundCloud" },
];

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get("onboarding") === "true";
  const { user: activeUser, isLoading, updateUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const isInitializedRef = useRef(false);

  const [links, setLinks] = useState<Record<string, string>>({
    instagram: "",
    facebook: "",
    youtube: "",
    spotify: "",
    bandcamp: "",
    soundcloud: "",
    beatstars: "",
    website: "",
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize profile data once when user is ready
  useEffect(() => {
    if (!isLoading) {
      if (!activeUser) {
        router.push("/signin");
      } else if (!isInitializedRef.current) {
        const fresh = producerService.getProducerById(activeUser.id) || activeUser;
        setProfile(fresh);
        setLinks({
          instagram: fresh.links?.instagram || "",
          facebook: fresh.links?.facebook || "",
          youtube: fresh.links?.youtube || "",
          spotify: fresh.links?.spotify || "",
          bandcamp: fresh.links?.bandcamp || "",
          soundcloud: fresh.links?.soundcloud || "",
          beatstars: fresh.links?.beatstars || "",
          website: fresh.links?.website || "",
        });
        isInitializedRef.current = true;
      }
    }
  }, [activeUser, isLoading, router]);

  if (isLoading || !profile) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || isSaving) return;
    setIsSaving(true);

    const normalizedFormLinks: Record<string, string> = {};
    const sanitizedSaveLinks: Record<string, string> = {};

    SOCIAL_PLATFORMS.forEach(({ key }) => {
      const val = links[key]?.trim() || "";
      if (val) {
        const normalized = normalizeUrl(val, key);
        normalizedFormLinks[key] = normalized;
        sanitizedSaveLinks[key] = normalized;
      } else {
        normalizedFormLinks[key] = "";
      }
    });

    setLinks(normalizedFormLinks);

    const updated = producerService.updateProducer(profile.id, {
      ...profile,
      nickname: profile.nickname.trim() || profile.nickname,
      avatarUrl: profile.avatarUrl || "/avatars/default-avatar.png",
      bio: profile.bio || "",
      location: profile.location || "",
      hideEmail: Boolean(profile.hideEmail),
      links: sanitizedSaveLinks,
      isClaimed: true,
      claimedAt: profile.claimedAt || new Date().toISOString(),
    });

    if (updated) {
      setProfile(updated);
      updateUser(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
    setIsSaving(false);
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && profile) {
      const { url } = await storageService.uploadImage(file, "avatars");
      if (url) {
        setProfile({ ...profile, avatarUrl: url });
      } else {
        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
          const res = uploadEvent.target?.result;
          if (res) {
            setProfile({ ...profile, avatarUrl: res as string });
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleToggleHideEmail = () => {
    if (!profile) return;
    setProfile({ ...profile, hideEmail: !profile.hideEmail });
  };

  const showOnboardingBanner = isOnboarding || !profile.isClaimed;

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in duration-300">

      {/* First-Time Login Onboarding Prompt */}
      {showOnboardingBanner && (
        <div className="bg-brand/10 rounded-3xl p-6 space-y-3 animate-in fade-in duration-300 shadow-md">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-brand" />
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              Complete Your User Profile
            </h2>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">
            Welcome to Beats & Pieces! Your historical battle entries have been linked to your account.
            Please upload your profile picture, bio, location, and music links below so other producers and listeners can connect with you.
          </p>
        </div>
      )}

      {/* Floating Save Toast Notification in Portal to prevent layout shift */}
      {saveSuccess && (
        <ClientPortal>
          <div className="fixed bottom-6 right-6 z-50 bg-[#181818] text-white px-5 py-3.5 rounded-3xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 backdrop-blur-md">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Profile Saved</p>
              <p className="text-xs text-zinc-400">Profile details saved successfully!</p>
            </div>
          </div>
        </ClientPortal>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        
        {/* CONTAINER 1: DETAILS */}
        <div className="bg-[#181818] rounded-[28px] p-6 sm:p-8 space-y-5 shadow-lg">
          <h2 className="text-2xl font-bold text-white">Details</h2>

          {/* Profile Picture Upload */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <label className="sm:col-span-3 text-xs font-bold text-[#D1D1D1]">
              Profile Picture
            </label>
            <div className="sm:col-span-9 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden relative bg-[#121212] shrink-0 shadow-md">
                <Image
                  src={profile.avatarUrl || "/avatars/default-avatar.png"}
                  alt={profile.nickname}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="px-4 py-2 rounded-3xl bg-[#222222] hover:bg-[#2A2A2A] text-xs font-bold text-white cursor-pointer transition-colors flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5 text-brand" />
                  <span>Change Picture</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-[#777777]">JPG, PNG or WEBP</span>
              </div>
            </div>
          </div>

          {/* Nickname */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <label className="sm:col-span-3 text-xs font-bold text-[#D1D1D1]">
              Nickname
            </label>
            <div className="sm:col-span-9">
              <input
                type="text"
                value={profile.nickname}
                onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
                className="w-full bg-[#121212] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
                required
              />
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <label className="sm:col-span-3 text-xs font-bold text-[#D1D1D1]">
              Location
            </label>
            <div className="sm:col-span-9">
              <input
                type="text"
                value={profile.location || ""}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                className="w-full bg-[#121212] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
              />
            </div>
          </div>

          {/* Bio */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
            <label className="sm:col-span-3 text-xs font-bold text-[#D1D1D1] pt-2">
              Bio
            </label>
            <div className="sm:col-span-9">
              <textarea
                rows={3}
                value={profile.bio || ""}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                className="w-full bg-[#121212] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF] resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Google E-mail */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <label className="sm:col-span-3 text-xs font-bold text-[#D1D1D1]">
              Google E-mail
            </label>
            <div className="sm:col-span-9 space-y-3">
              <div className="w-full bg-[#121212] rounded-xl px-4 py-3 text-sm text-[#E0E0E0] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 truncate">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.5 0 2.9.5 4 1.4l3-3C17.2 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
                    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9c-.2-.7-.4-1.5-.4-2.3z"/>
                    <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"/>
                  </svg>
                  <span className="font-mono text-sm text-white select-all">{profile.email}</span>
                </div>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full flex items-center gap-1.5 shrink-0 select-none">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Google Auth</span>
                </span>
              </div>

              {/* Option to hide e-mail from public profile */}
              <div className="flex items-center justify-between px-4 py-3 rounded-3xl bg-[#121212]">
                <span className="text-xs font-bold text-white block">Hide email from public profile</span>
                <button
                  type="button"
                  onClick={handleToggleHideEmail}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
                    profile.hideEmail ? "bg-[#7B61FF]" : "bg-[#282828]"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      profile.hideEmail ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* CONTAINER 2: SOCIALS */}
        <div className="bg-[#181818] rounded-[28px] p-6 sm:p-8 space-y-6 shadow-lg">
          <h2 className="text-2xl font-bold text-white">Socials</h2>

          {SOCIAL_PLATFORMS.map(({ key, label }) => {
            const url = links[key] || "";
            return (
              <div
                key={key}
                className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center"
              >
                <label className="sm:col-span-3 text-xs font-bold text-[#D1D1D1]">
                  {label}
                </label>
                <div className="sm:col-span-9 relative flex items-center">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) =>
                      setLinks((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className="w-full bg-[#121212] rounded-3xl pl-4 pr-10 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
                  />
                  {url && (
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => {
                        setLinks((prev) => ({ ...prev, [key]: "" }));
                      }}
                      className="absolute right-3 text-[#777777] hover:text-white transition-colors cursor-pointer"
                      title="Clear field"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

        </div>

        {/* BOTTOM RIGHT: SAVE CHANGES BUTTON */}
        <div className="flex items-center justify-end pt-2 pb-6">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 rounded-3xl bg-[#7B61FF] hover:bg-[#684DE6] text-white text-xs font-bold transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            <span>Save Changes</span>
          </button>
        </div>

      </form>

    </div>
  );
}

export default function UserProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
