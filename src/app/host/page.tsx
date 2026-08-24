"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Edit3, Plus, Trophy, Calendar, Users, Disc, X, Music, Trash2, Image as ImageIcon } from "lucide-react";
import { HostGuard } from "@/components/HostGuard";
import { battleService, producerService, storageService } from "@/services";
import { useAuth } from "@/lib/auth-context";
import { Competition, BattlePhase, BattleSample } from "@/lib/types";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { ClientPortal } from "@/components/ClientPortal";

interface PersonEntry {
  name: string;
  email: string;
}

export default function HostPanelPage() {
  const { user } = useAuth();
  const [hostedBattles, setHostedBattles] = useState<Competition[]>([]);
  const [editingBattle, setEditingBattle] = useState<Competition | null>(null);

  // Judges state with email accounts
  const [judgeEntries, setJudgeEntries] = useState<PersonEntry[]>([]);
  const [judgeNameInput, setJudgeNameInput] = useState("");
  const [judgeEmailInput, setJudgeEmailInput] = useState("");
  const [showAddJudge, setShowAddJudge] = useState(false);

  // Samples state (Upload only)
  const [samples, setSamples] = useState<BattleSample[]>([]);

  const [isSaved, setIsSaved] = useState(false);

  // Lock page scrolling when edit battle modal is open
  useBodyScrollLock(Boolean(editingBattle));

  useEffect(() => {
    if (user) {
      const refresh = () => {
        if (user.role === "admin") {
          setHostedBattles(battleService.getAllBattles());
        } else {
          const myBattles = battleService.getBattlesByHost(user.email || user.nickname);
          setHostedBattles(myBattles);
        }
      };

      refresh();
      battleService.syncFromSupabase().then(refresh);

      window.addEventListener("bnp_battles_updated", refresh);
      window.addEventListener("storage", refresh);
      return () => {
        window.removeEventListener("bnp_battles_updated", refresh);
        window.removeEventListener("storage", refresh);
      };
    }
  }, [user]);

  const handleEditClick = (battle: Competition) => {
    setEditingBattle({ ...battle });

    const initialJudges: PersonEntry[] = battle.judgeDetails
      ? [...battle.judgeDetails]
      : battle.judges.map((j) => {
          const match = producerService.getAllProducers().find(
            (p) => p.nickname.toLowerCase() === j.toLowerCase()
          );
          return {
            name: j,
            email: match?.email || `${j.toLowerCase().replace(/[^a-z0-9]/g, "")}@judge.ro`,
          };
        });

    setJudgeEntries(initialJudges);
    setJudgeNameInput("");
    setJudgeEmailInput("");
    setShowAddJudge(false);

    setSamples(battle.samples ? [...battle.samples] : []);
    setIsSaved(false);
  };

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingBattle) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setEditingBattle({
            ...editingBattle,
            coverImage: uploadEvent.target.result as string,
          });
        }
      };
      reader.readAsDataURL(file);
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

  const handleAddJudge = () => {
    if (judgeNameInput.trim() && judgeEmailInput.trim()) {
      setJudgeEntries([
        ...judgeEntries,
        { name: judgeNameInput.trim(), email: judgeEmailInput.trim().toLowerCase() },
      ]);
      setJudgeNameInput("");
      setJudgeEmailInput("");
      setShowAddJudge(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBattle) return;

    // Register or promote judge accounts in producerService
    judgeEntries.forEach((j) => {
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

    const updated = {
      ...editingBattle,
      judges: judgeEntries.map((j) => j.name),
      judgeDetails: judgeEntries,
      samples: samples,
    };

    await battleService.updateBattle(updated.id, updated);
    if (user?.role === "admin") {
      setHostedBattles(battleService.getAllBattles());
    } else if (user) {
      setHostedBattles(battleService.getBattlesByHost(user.email || user.nickname));
    }
    setIsSaved(true);
    setTimeout(() => {
      setEditingBattle(null);
      setIsSaved(false);
    }, 800);
  };

  return (
    <HostGuard>
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300 py-4">
        
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Disc className="w-7 h-7 text-[#FF8A65]" />
            <span>Host Control Panel</span>
          </h1>
          <p className="text-xs text-zinc-400">
            Welcome, <strong className="text-white">{user?.nickname}</strong>. You have host management permissions for the following battles:
          </p>
        </div>

        {/* Battles List */}
        {hostedBattles.length === 0 ? (
          <div className="bg-[#181818] rounded-[28px] p-8 text-center space-y-3 shadow-lg">
            <p className="text-sm text-zinc-400">
              You are not currently assigned as an active host for any upcoming battles.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {hostedBattles.map((battle) => (
              <div
                key={battle.id}
                className="bg-surface-card rounded-[28px] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg hover:bg-surface-hover transition-all"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-xl overflow-hidden relative shrink-0 bg-[#121212] shadow-md">
                    <Image
                      src={battle.coverImage}
                      alt={battle.title}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-white truncate">{battle.title}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        battle.phase === "completed"
                          ? "bg-zinc-800 text-zinc-400"
                          : "bg-[#FF8A65]/20 text-[#FF8A65]"
                      }`}>
                        {battle.phase === "submission"
                          ? "Phase 1: Submissions"
                          : battle.phase === "rating"
                          ? "Phase 2: Rating"
                          : battle.phase === "judging"
                          ? "Phase 3: Judging"
                          : "Phase 4: Results"}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-zinc-400 flex-wrap">
                      <span>Host: {battle.hosts?.[0] || "Nerub"}</span>
                      {battle.judges.length > 0 && <span>Judges: {battle.judges.join(", ")}</span>}
                      <span>{battle.samples?.length || 0} Sample(s)</span>
                      <span>{battle.totalSubmissions} Entries</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => handleEditClick(battle)}
                    className="px-4 py-2 rounded-3xl bg-[#222222] hover:bg-[#FF8A65] hover:text-white text-xs font-bold text-zinc-300 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Battle</span>
                  </button>
                  <Link
                    href={`/battles/${battle.id}`}
                    className="px-4 py-2 rounded-3xl bg-[#181818] hover:bg-[#252525] text-xs font-bold text-zinc-400 hover:text-white transition-all"
                  >
                    View Public
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* EDIT BATTLE MODAL */}
        <ClientPortal>
          {editingBattle && (
            <div
              onClick={() => setEditingBattle(null)}
              className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="bg-[#181818] rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto cursor-default"
              >
                <div className="flex items-center justify-between pb-2">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-[#FF8A65]" />
                    <span>Edit Hosted Battle</span>
                  </h2>
                  <button
                    onClick={() => setEditingBattle(null)}
                    className="w-8 h-8 rounded-full bg-[#121212] text-zinc-400 hover:text-white flex items-center justify-center text-sm cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-5 text-left text-xs">
                  {/* Title */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Battle Title</label>
                    <input
                      type="text"
                      value={editingBattle.title}
                      onChange={(e) => setEditingBattle({ ...editingBattle, title: e.target.value })}
                      className="w-full bg-[#121212] rounded-3xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
                      required
                    />
                  </div>

                  {/* Cover Art Upload */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Cover Art</label>
                    <div className="flex items-center gap-4 bg-[#121212] p-3 rounded-3xl">
                      <div className="w-16 h-16 rounded-3xl overflow-hidden relative bg-[#181818] shrink-0 flex items-center justify-center text-zinc-600 shadow-md">
                        {editingBattle.coverImage ? (
                          <Image
                            src={editingBattle.coverImage}
                            alt="Cover Preview"
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-zinc-600" />
                        )}
                      </div>
                    <div className="flex items-center justify-between flex-1">
                      <span className="text-xs text-zinc-400">Change square cover artwork</span>
                      <label className="px-4 py-2 rounded-3xl bg-[#222222] hover:bg-[#2A2A2A] text-xs font-bold text-white cursor-pointer transition-colors shrink-0">
                        Browse File
                        <input type="file" accept="image/*" onChange={handleCoverFileChange} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Judged by */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-300">Judges</label>
                    <span className="text-xs text-zinc-500">Google accounts unlock Jury Portal</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {judgeEntries.map((judge, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-3xl bg-[#121212] text-xs font-bold text-white shadow-sm"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold">{judge.name}</span>
                          <span className="text-xs text-zinc-400 font-mono">({judge.email})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setJudgeEntries(judgeEntries.filter((_, i) => i !== idx))}
                          className="w-4 h-4 rounded-full bg-[#262626] text-zinc-400 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {showAddJudge ? (
                    <div className="bg-[#121212] p-3.5 rounded-3xl space-y-2.5 animate-in fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Judge Name (e.g. Vlad Dobrescu)"
                          value={judgeNameInput}
                          onChange={(e) => setJudgeNameInput(e.target.value)}
                          className="bg-[#181818] rounded-3xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
                          autoFocus
                        />
                        <input
                          type="email"
                          placeholder="Judge Google E-mail"
                          value={judgeEmailInput}
                          onChange={(e) => setJudgeEmailInput(e.target.value)}
                          className="bg-[#181818] rounded-3xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
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
                          disabled={!judgeNameInput.trim() || !judgeEmailInput.trim()}
                          className="px-4 py-1.5 rounded-3xl bg-[#FF8A65] hover:bg-[#FF7A50] text-xs text-white font-bold cursor-pointer disabled:opacity-50"
                        >
                          Assign Judge
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddJudge(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-3xl bg-[#121212] hover:bg-[#202020] text-xs text-[#D1D1D1] font-bold transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#FF8A65]" />
                      <span>Add Judge</span>
                    </button>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Description</label>
                  <textarea
                    rows={3}
                    value={editingBattle.description}
                    onChange={(e) => setEditingBattle({ ...editingBattle, description: e.target.value })}
                    className="w-full bg-[#121212] rounded-3xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                  />
                </div>

                {/* Rules */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 block">Rules</label>
                  <div className="bg-[#121212] p-3.5 rounded-3xl space-y-1.5 text-xs text-zinc-400">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                      Standard Default Rules:
                    </span>
                    <p>1. Maximum 1 entry per producer.</p>
                    <p>2. Track length must not exceed 3 minutes.</p>
                    <p>3. File type must be WAV or MP3.</p>
                    <p>4. Use at least 1 of the samples (if) provided.</p>
                  </div>
                </div>

                {/* Sample(s) Management (Upload file only, clean row without audio player) */}
                <div className="space-y-3 bg-[#121212] p-4 rounded-3xl">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-white uppercase tracking-wider text-xs">
                      Sample(s)
                    </label>
                    <span className="text-xs text-zinc-400">
                      Audio files competitors must flip
                    </span>
                  </div>

                  {samples.length > 0 && (
                    <div className="space-y-2">
                      {samples.map((sample) => (
                        <div
                          key={sample.id}
                          className="bg-[#181818] p-3 rounded-3xl flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-7 h-7 rounded-3xl bg-[#FF8A65]/10 text-[#FF8A65] flex items-center justify-center shrink-0">
                              <Music className="w-3.5 h-3.5" />
                            </div>
                            <input
                              type="text"
                              value={sample.title}
                              onChange={(e) => handleUpdateSampleTitle(sample.id, e.target.value)}
                              className="bg-transparent text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#FF8A65] rounded px-1.5 py-0.5 w-full"
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
                    <label className={`px-4 py-2 rounded-3xl text-xs font-bold text-white transition-colors inline-flex items-center gap-2 ${
                      isUploadingSamples ? "bg-[#333333] cursor-not-allowed opacity-75" : "bg-[#222222] hover:bg-[#2A2A2A] cursor-pointer"
                    }`}>
                      <Music className="w-3.5 h-3.5 text-[#FF8A65]" />
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

                {/* Timeline Deadlines */}
                <div className="bg-[#121212] p-4 rounded-3xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-white uppercase tracking-wider text-xs">
                      Timeline & Deadlines
                    </label>
                    <span className="text-xs text-zinc-400">
                      Active phase is automatically calculated from dates
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400">Start Date</label>
                      <input
                        type="datetime-local"
                        value={editingBattle.submissionStartsAt ? editingBattle.submissionStartsAt.slice(0, 16) : ""}
                        onChange={(e) =>
                          setEditingBattle({
                            ...editingBattle,
                            submissionStartsAt: e.target.value ? new Date(e.target.value).toISOString() : "",
                          })
                        }
                        className="w-full bg-[#181818] rounded-3xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400">Submission Deadline</label>
                      <input
                        type="datetime-local"
                        value={editingBattle.submissionEndsAt ? editingBattle.submissionEndsAt.slice(0, 16) : ""}
                        onChange={(e) =>
                          setEditingBattle({
                            ...editingBattle,
                            submissionEndsAt: e.target.value ? new Date(e.target.value).toISOString() : "",
                          })
                        }
                        className="w-full bg-[#181818] rounded-3xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400">Rating Deadline</label>
                      <input
                        type="datetime-local"
                        value={editingBattle.ratingEndsAt ? editingBattle.ratingEndsAt.slice(0, 16) : ""}
                        onChange={(e) =>
                          setEditingBattle({
                            ...editingBattle,
                            ratingEndsAt: e.target.value ? new Date(e.target.value).toISOString() : "",
                          })
                        }
                        className="w-full bg-[#181818] rounded-3xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingBattle(null)}
                    className="px-5 py-2.5 rounded-3xl bg-[#222222] hover:bg-[#2A2A2A] text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploadingSamples}
                    className="px-7 py-2.5 rounded-3xl bg-[#FF8A65] hover:bg-[#FF7A50] text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploadingSamples ? "Uploading Samples..." : isSaved ? "Saved ✓" : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </ClientPortal>

      </div>
    </HostGuard>
  );
}
