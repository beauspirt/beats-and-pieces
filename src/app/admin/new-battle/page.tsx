"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus, X, ArrowLeft, Music, Trash2, Image as ImageIcon } from "lucide-react";
import { AdminGuard } from "@/components/AdminGuard";
import { battleService, producerService, storageService } from "@/services";
import { BattleSample, UserProfile } from "@/lib/types";

interface PersonEntry {
  name: string;
  email: string;
}

export default function NewBattlePage() {
  const router = useRouter();
  const [battleNumber, setBattleNumber] = useState<number>(() => {
    const existing = battleService.getAllCompetitions();
    return existing.reduce((max, b) => Math.max(max, b.number || 0), 0) + 1;
  });
  const [title, setTitle] = useState("");
  const [coverImage, setCoverImage] = useState("");
  
  // Hosts state with email accounts
  const [hosts, setHosts] = useState<PersonEntry[]>([
    { name: "Nerub", email: "adrian.hrihor@gmail.com" },
  ]);
  const [hostNameInput, setHostNameInput] = useState("");
  const [hostEmailInput, setHostEmailInput] = useState("");
  const [showAddHost, setShowAddHost] = useState(false);

  // Judges state with email accounts
  const [judges, setJudges] = useState<PersonEntry[]>([]);
  const [judgeNameInput, setJudgeNameInput] = useState("");
  const [judgeEmailInput, setJudgeEmailInput] = useState("");
  const [showAddJudge, setShowAddJudge] = useState(false);

  const [description, setDescription] = useState("");
  const [extraRules, setExtraRules] = useState<string[]>([]);
  const [newRuleInput, setNewRuleInput] = useState("");
  const [showAddRule, setShowAddRule] = useState(false);

  // Working Samples state (Audio file uploads only)
  const [samples, setSamples] = useState<BattleSample[]>([]);

  const [startDate, setStartDate] = useState("");
  const [submissionDeadline, setSubmissionDeadline] = useState("");
  const [ratingDeadline, setRatingDeadline] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const { url } = await storageService.uploadImage(file, "battles");
      if (url) {
        setCoverImage(url);
      } else {
        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
          if (uploadEvent.target?.result) {
            setCoverImage(uploadEvent.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const [isUploadingSamples, setIsUploadingSamples] = useState(false);

  const handleSampleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const MAX_FILE_SIZE = 250 * 1024 * 1024;
    const oversized = Array.from(files).find((f) => f.size > MAX_FILE_SIZE);
    if (oversized) {
      const sizeMB = (oversized.size / (1024 * 1024)).toFixed(1);
      alert(`Sample file "${oversized.name}" is too large (${sizeMB} MB). Maximum source audio size is 250 MB per file.`);
      e.target.value = "";
      return;
    }

    setIsUploadingSamples(true);
    try {
      const fileList = Array.from(files);
      const uploadPromises = fileList.map(async (file, idx) => {
        const sampleId = `s-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
        const sampleTitle = file.name.replace(/\.[^/.]+$/, "");
        const cleanSlug = sampleTitle.toLowerCase().replace(/[^a-z0-9_-]/g, "_") || "sample";
        
        let realDuration = 90;
        try {
          const arrayBuf = await file.arrayBuffer();
          const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            const decoded = await ctx.decodeAudioData(arrayBuf.slice(0));
            realDuration = Math.round(decoded.duration);
            ctx.close();
          }
        } catch {}

        const { url, error } = await storageService.uploadAudio(file, "samples", `${cleanSlug}-${Date.now()}-${idx}`);
        if (!url) {
          throw new Error(error || `Failed to upload sample "${file.name}"`);
        }

        return {
          id: sampleId,
          title: sampleTitle,
          audioUrl: url,
          duration: realDuration,
        };
      });

      const uploadedSamples = await Promise.all(uploadPromises);
      setSamples((prev) => [...prev, ...uploadedSamples]);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to upload audio samples. Please try again.");
    } finally {
      setIsUploadingSamples(false);
      e.target.value = "";
    }
  };

  const handleRemoveSample = (sampleId: string) => {
    setSamples((prev) => prev.filter((s) => s.id !== sampleId));
  };

  const handleUpdateSampleTitle = (sampleId: string, newTitle: string) => {
    setSamples((prev) =>
      prev.map((s) => (s.id === sampleId ? { ...s, title: newTitle } : s))
    );
  };

  const handleAddHost = () => {
    const cleanName = hostNameInput.trim();
    if (!cleanName) return;

    let cleanEmail = hostEmailInput.trim().toLowerCase();
    if (!cleanEmail) {
      const match = producerService.getAllProducers().find(
        (p) => p.nickname.toLowerCase() === cleanName.toLowerCase()
      );
      cleanEmail = match?.email || (cleanName.toLowerCase() === "nerub" ? "adrian.hrihor@gmail.com" : `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "")}@beatsandpieces.ro`);
    }

    // Single host per battle
    setHosts([{ name: cleanName, email: cleanEmail }]);
    setHostNameInput("");
    setHostEmailInput("");
    setShowAddHost(false);
  };

  const handleAddJudge = () => {
    const cleanName = judgeNameInput.trim();
    if (!cleanName) return;

    let cleanEmail = judgeEmailInput.trim().toLowerCase();
    if (!cleanEmail) {
      const match = producerService.getAllProducers().find(
        (p) => p.nickname.toLowerCase() === cleanName.toLowerCase()
      );
      cleanEmail = match?.email || (cleanName.toLowerCase() === "nerub" ? "adrian.hrihor@gmail.com" : `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "")}@judge.ro`);
    }

    setJudges([
      ...judges,
      { name: cleanName, email: cleanEmail },
    ]);
    setJudgeNameInput("");
    setJudgeEmailInput("");
    setShowAddJudge(false);
  };

  const handleAddRule = () => {
    if (newRuleInput.trim()) {
      setExtraRules([...extraRules, newRuleInput.trim()]);
      setNewRuleInput("");
      setShowAddRule(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaved(true);

    // Register or promote host accounts in producerService
    hosts.forEach((h) => {
      const cleanEmail = h.email.toLowerCase().trim();
      const existing = producerService.getProducerByEmail(cleanEmail);
      if (existing) {
        if (existing.role !== "admin") {
          producerService.updateProducer(existing.id, { role: "host" });
        }
      } else {
        const id = h.name.toLowerCase().replace(/[^a-z0-9]/g, "") || String(Date.now());
        producerService.updateProducer(id, {
          id,
          nickname: h.name,
          email: cleanEmail,
          avatarUrl: "/avatars/default-avatar.png",
          role: "host",
          isClaimed: false,
          createdAt: new Date().toISOString(),
        });
      }
    });

    // Register or promote judge accounts in producerService
    judges.forEach((j) => {
      const cleanEmail = j.email.toLowerCase().trim();
      const existing = producerService.getProducerByEmail(cleanEmail);
      if (existing) {
        if (existing.role !== "admin") {
          producerService.updateProducer(existing.id, { role: "judge" });
        }
      } else {
        const id = j.name.toLowerCase().replace(/[^a-z0-9]/g, "") || String(Date.now());
        producerService.updateProducer(id, {
          id,
          nickname: j.name,
          email: cleanEmail,
          avatarUrl: "/avatars/default-avatar.png",
          role: "judge",
          isClaimed: false,
          createdAt: new Date().toISOString(),
        });
      }
    });

    setIsSaved(true);
    try {
      await battleService.createBattle({
        title: title.trim(),
        coverImage: coverImage || "/covers/default-battle.png",
        hosts: hosts.map((h) => h.name),
        hostDetails: hosts,
        judges: judges.map((j) => j.name),
        judgeDetails: judges,
        description: description.trim(),
        rules: extraRules,
        samples: samples,
        submissionStartsAt: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        submissionEndsAt: submissionDeadline ? new Date(submissionDeadline).toISOString() : new Date(Date.now() + 14 * 86400000).toISOString(),
        ratingEndsAt: ratingDeadline ? new Date(ratingDeadline).toISOString() : new Date(Date.now() + 21 * 86400000).toISOString(),
      });
    } catch (err) {
      // console.error("Failed to create battle:", err);
    }

    setTimeout(() => {
      router.push("/battles");
      router.refresh();
    }, 400);
  };

  return (
    <AdminGuard>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300 py-4">
        
        {/* Top Header & Breadcrumb */}
        <div className="space-y-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-[#888888] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Admin Panel</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Create a New Battle</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
        
          {/* CONTAINER: DETAILS */}
          <div className="bg-[#181818] rounded-2xl p-6 sm:p-8 space-y-6">
            <h2 className="text-2xl font-bold text-white">Details</h2>

            {/* Title */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <label className="sm:col-span-3 text-xs font-bold text-[#D1D1D1]">
                Title
              </label>
              <div className="sm:col-span-9">
                <input
                  type="text"
                  placeholder="e.g. Beat Battle #9"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#121212] rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
                  required
                />
              </div>
            </div>

            {/* Cover Image Upload */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <label className="sm:col-span-3 text-xs font-bold text-[#D1D1D1]">
                Cover Art
              </label>
              <div className="sm:col-span-9">
                <div className="flex items-center gap-4 bg-[#121212] p-3 rounded-2xl">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden relative bg-[#181818] shrink-0 flex items-center justify-center text-zinc-600 shadow-md">
                    {coverImage ? (
                      <Image
                        src={coverImage}
                        alt="Cover Preview"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-zinc-600" />
                    )}
                  </div>
                  <div className="flex items-center justify-between flex-1">
                    <span className="text-xs text-[#777777]">
                      {coverImage ? "Custom image selected" : "No artwork selected (square format recommended)"}
                    </span>
                    <label className="px-4 py-2 rounded-2xl bg-[#222222] hover:bg-[#2A2A2A] text-xs font-bold text-white cursor-pointer transition-colors shrink-0">
                      Browse File
                      <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Host */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
              <div className="sm:col-span-3 pt-2">
                <label className="text-xs font-bold text-[#D1D1D1] block">
                  Host
                </label>
                <span className="text-xs text-[#888888] block">Google accounts unlock Host Panel</span>
              </div>

              <div className="sm:col-span-9 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  {hosts.map((host, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-2xl bg-[#121212] text-xs font-bold text-white shadow-sm"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold">{host.name}</span>
                        <span className="text-xs text-zinc-400 font-mono">({host.email})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setHosts([])}
                        className="w-4 h-4 rounded-full bg-[#262626] text-zinc-400 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {showAddHost ? (
                  <div className="bg-[#121212] p-3.5 rounded-2xl space-y-2.5 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Host Name / Nickname (e.g. Nerub)"
                        value={hostNameInput}
                        onChange={(e) => setHostNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddHost();
                          }
                        }}
                        className="bg-[#181818] rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
                        autoFocus
                      />
                      <input
                        type="email"
                        placeholder="Host Google E-mail (Optional)"
                        value={hostEmailInput}
                        onChange={(e) => setHostEmailInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddHost();
                          }
                        }}
                        className="bg-[#181818] rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddHost(false)}
                        className="px-3 py-1.5 text-xs text-[#888888] hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddHost}
                        disabled={!hostNameInput.trim()}
                        className="px-4 py-1.5 rounded-2xl bg-[#7B61FF] hover:bg-[#684DE6] text-xs text-white font-bold cursor-pointer disabled:opacity-50"
                      >
                        Set Host
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddHost(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#121212] hover:bg-[#202020] text-xs text-[#D1D1D1] font-bold transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#7B61FF]" />
                    <span>{hosts.length > 0 ? "Change Host" : "Assign Host"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Judged by */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
              <div className="sm:col-span-3 pt-2">
                <label className="text-xs font-bold text-[#D1D1D1] block">
                  Judges
                </label>
                <span className="text-xs text-[#888888] block">Google accounts unlock Jury Portal</span>
              </div>

              <div className="sm:col-span-9 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  {judges.map((judge, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-2xl bg-[#121212] text-xs font-bold text-white shadow-sm"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold">{judge.name}</span>
                        <span className="text-xs text-zinc-400 font-mono">({judge.email})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setJudges(judges.filter((_, i) => i !== idx))}
                        className="w-4 h-4 rounded-full bg-[#262626] text-zinc-400 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {showAddJudge ? (
                  <div className="bg-[#121212] p-3.5 rounded-2xl space-y-2.5 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Judge Name / Nickname (e.g. Deliric)"
                        value={judgeNameInput}
                        onChange={(e) => setJudgeNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddJudge();
                          }
                        }}
                        className="bg-[#181818] rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
                        autoFocus
                      />
                      <input
                        type="email"
                        placeholder="Judge Google E-mail (Optional)"
                        value={judgeEmailInput}
                        onChange={(e) => setJudgeEmailInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddJudge();
                          }
                        }}
                        className="bg-[#181818] rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddJudge(false)}
                        className="px-3 py-1.5 text-xs text-[#888888] hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddJudge}
                        disabled={!judgeNameInput.trim()}
                        className="px-4 py-1.5 rounded-2xl bg-[#7B61FF] hover:bg-[#684DE6] text-xs text-white font-bold cursor-pointer disabled:opacity-50"
                      >
                        Assign Judge
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddJudge(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#121212] hover:bg-[#202020] text-xs text-[#D1D1D1] font-bold transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#7B61FF]" />
                    <span>Add Judge</span>
                  </button>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
              <label className="sm:col-span-3 text-xs font-bold text-[#D1D1D1] pt-2">
                Description
              </label>
              <div className="sm:col-span-9">
                <textarea
                  rows={4}
                  placeholder="Enter battle rules, theme, and sample guidelines..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#121212] rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF] resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* Rules */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
              <div className="sm:col-span-3 pt-1.5">
                <label className="text-xs font-bold text-[#D1D1D1] block">
                  Rules
                </label>
                <span className="text-xs text-[#888888] block">Default & extra rules</span>
              </div>
              <div className="sm:col-span-9 space-y-2.5">
                {/* Default Rules */}
                <div className="bg-[#121212] p-3.5 rounded-2xl space-y-1.5 text-xs text-zinc-400">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                    Standard Default Rules:
                  </span>
                  <p>1. Maximum 1 entry per producer.</p>
                  <p>2. Track length must not exceed 3 minutes.</p>
                  <p>3. File type must be WAV or MP3.</p>
                  <p>4. Use at least 1 of the samples (if) provided.</p>
                </div>

                {/* Extra Rules */}
                {extraRules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 pl-3.5 pr-2 py-2 rounded-2xl bg-[#121212] text-xs text-white"
                  >
                    <span>{idx + 5}. {rule}</span>
                    <button
                      type="button"
                      onClick={() => setExtraRules(extraRules.filter((_, i) => i !== idx))}
                      className="w-5 h-5 rounded-full bg-[#202020] text-[#888888] hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {showAddRule ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Must flip the sample melody..."
                      value={newRuleInput}
                      onChange={(e) => setNewRuleInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddRule();
                        }
                      }}
                      className="flex-1 bg-[#121212] rounded-2xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddRule}
                      className="px-3.5 py-2 rounded-2xl bg-[#7B61FF] hover:bg-[#684DE6] text-xs text-white font-bold cursor-pointer"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddRule(false)}
                      className="px-2 py-2 text-xs text-[#888888] hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddRule(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#121212] hover:bg-[#202020] text-xs text-[#D1D1D1] font-bold transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#7B61FF]" />
                    <span>Add Extra Rule</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sample(s) Management (Upload file only, clean row without audio player) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
              <div className="sm:col-span-3 pt-2">
                <label className="text-xs font-bold text-[#D1D1D1] block">
                  Sample(s)
                </label>
                <span className="text-xs text-[#888888] block">Audio samples for competitors to flip</span>
              </div>

              <div className="sm:col-span-9 space-y-3">
                {samples.length > 0 && (
                  <div className="space-y-2">
                    {samples.map((sample) => (
                      <div
                        key={sample.id}
                        className="bg-[#121212] p-3 rounded-2xl flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-7 h-7 rounded-2xl bg-[#7B61FF]/10 text-[#7B61FF] flex items-center justify-center shrink-0">
                            <Music className="w-3.5 h-3.5" />
                          </div>
                          <input
                            type="text"
                            value={sample.title}
                            onChange={(e) => handleUpdateSampleTitle(sample.id, e.target.value)}
                            className="bg-transparent text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF] rounded px-1.5 py-0.5 w-full"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveSample(sample.id)}
                          className="text-zinc-500 hover:text-red-400 transition-colors p-1 cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className={`px-4 py-2 rounded-2xl text-xs font-bold text-white transition-colors inline-flex items-center gap-2 ${
                    isUploadingSamples ? "bg-[#333333] cursor-not-allowed opacity-75" : "bg-[#222222] hover:bg-[#2A2A2A] cursor-pointer"
                  }`}>
                    <Music className="w-3.5 h-3.5 text-[#7B61FF]" />
                    <span>{isUploadingSamples ? "Uploading Sample(s)..." : "Upload Audio Sample(s)"}</span>
                    <input
                      type="file"
                      multiple
                      disabled={isUploadingSamples}
                      accept="audio/mp3,audio/wav,audio/*"
                      onChange={handleSampleFilesUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Timeline Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <label className="sm:col-span-3 text-xs font-bold text-[#D1D1D1]">
                Start Date
              </label>
              <div className="sm:col-span-9">
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-[#121212] rounded-2xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <label className="sm:col-span-3 text-xs font-bold text-[#D1D1D1]">
                Submission Deadline
              </label>
              <div className="sm:col-span-9">
                <input
                  type="datetime-local"
                  value={submissionDeadline}
                  onChange={(e) => setSubmissionDeadline(e.target.value)}
                  className="w-full bg-[#121212] rounded-2xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <label className="sm:col-span-3 text-xs font-bold text-[#D1D1D1]">
                Rating Deadline
              </label>
              <div className="sm:col-span-9">
                <input
                  type="datetime-local"
                  value={ratingDeadline}
                  onChange={(e) => setRatingDeadline(e.target.value)}
                  className="w-full bg-[#121212] rounded-2xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <label className="sm:col-span-3 text-xs font-bold text-[#D1D1D1]">
                Judging Phase
              </label>
              <div className="sm:col-span-9 text-xs text-[#888888]">
                No deadline required — Phase 3 concludes automatically into Results once all assigned judges have submitted their scores.
              </div>
            </div>

          </div>

          {/* Bottom Save Button */}
          <div className="text-right pt-2">
            <button
              type="submit"
              disabled={isUploadingSamples}
              className="px-10 py-3 rounded-2xl bg-[#7B61FF] hover:bg-[#684DE6] text-white text-xs font-bold transition-all shadow-lg active:scale-95 ml-auto cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploadingSamples ? "Uploading Samples..." : isSaved ? "Battle Created ✓" : "Create Battle"}
            </button>
          </div>

        </form>

      </div>
    </AdminGuard>
  );
}
