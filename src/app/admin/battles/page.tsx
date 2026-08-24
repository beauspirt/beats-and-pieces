"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Edit3, Plus, Check, X, Trophy, Calendar, Users, Music, Trash2, Upload, Image as ImageIcon } from "lucide-react";
import { AdminGuard } from "@/components/AdminGuard";
import { battleService, producerService, storageService } from "@/services";
import { Competition, BattlePhase, BattleSample } from "@/lib/types";

interface PersonEntry {
  name: string;
  email: string;
}

export default function AdminBattlesManagerPage() {
  const [battles, setBattles] = useState<Competition[]>([]);
  const [editingBattle, setEditingBattle] = useState<Competition | null>(null);

  // Hosts state with email accounts
  const [hostEntries, setHostEntries] = useState<PersonEntry[]>([]);
  const [hostNameInput, setHostNameInput] = useState("");
  const [hostEmailInput, setHostEmailInput] = useState("");
  const [showAddHost, setShowAddHost] = useState(false);

  // Judges state with email accounts
  const [judgeEntries, setJudgeEntries] = useState<PersonEntry[]>([]);
  const [judgeNameInput, setJudgeNameInput] = useState("");
  const [judgeEmailInput, setJudgeEmailInput] = useState("");
  const [showAddJudge, setShowAddJudge] = useState(false);

  // Samples state (Upload only)
  const [samples, setSamples] = useState<BattleSample[]>([]);

  // Extra Rules state
  const [extraRules, setExtraRules] = useState<string[]>([]);
  const [newRuleInput, setNewRuleInput] = useState("");
  const [showAddRule, setShowAddRule] = useState(false);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const refresh = () => setBattles(battleService.getAllCompetitions());
    refresh();
    battleService.syncFromSupabase().then(refresh);

    window.addEventListener("bnp_battles_updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("bnp_battles_updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const handleEditClick = (battle: Competition) => {
    setEditingBattle({ ...battle });

    // Normalize hosts
    const initialHosts: PersonEntry[] = battle.hostDetails
      ? [...battle.hostDetails]
      : battle.hosts.map((h) => {
          const match = producerService.getAllProducers().find(
            (p) => p.nickname.toLowerCase() === h.toLowerCase()
          );
          return {
            name: h,
            email: match?.email || (h.toLowerCase() === "nerub" ? "adrian.hrihor@gmail.com" : `${h.toLowerCase().replace(/[^a-z0-9]/g, "")}@beatsandpieces.ro`),
          };
        });

    // Normalize judges
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

    setHostEntries(initialHosts);
    setHostNameInput("");
    setHostEmailInput("");
    setShowAddHost(false);

    setJudgeEntries(initialJudges);
    setJudgeNameInput("");
    setJudgeEmailInput("");
    setShowAddJudge(false);

    setSamples(battle.samples ? [...battle.samples] : []);
    setExtraRules(battle.rules ? [...battle.rules] : []);
    setNewRuleInput("");
    setShowAddRule(false);
    setShowDeleteConfirm(false);
    setIsSaved(false);
  };

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingBattle) {
      const { url } = await storageService.uploadImage(file, "battles");
      if (url) {
        setEditingBattle({
          ...editingBattle,
          coverImage: url,
        });
      } else {
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
    }
  };

  const handleSampleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newSamples: BattleSample[] = [];
    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      const sampleId = `s-${Date.now()}-${idx}`;
      const sampleTitle = file.name.replace(/\.[^/.]+$/, "");
      const cleanSlug = sampleTitle.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
      const { url } = await storageService.uploadAudio(file, "samples", `${cleanSlug}-${Date.now()}-${idx}`);
      const sampleUrl = url || URL.createObjectURL(file);

      newSamples.push({
        id: sampleId,
        title: sampleTitle,
        audioUrl: sampleUrl,
        duration: 90,
      });
    }

    setSamples((prev) => [...prev, ...newSamples]);
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

    // Only one host per battle
    setHostEntries([{ name: cleanName, email: cleanEmail }]);
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

    setJudgeEntries([
      ...judgeEntries,
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

  const handleDeleteBattle = async () => {
    if (!editingBattle) return;
    await battleService.deleteBattle(editingBattle.id);
    setBattles(battleService.getAllBattles());
    setShowDeleteConfirm(false);
    setEditingBattle(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBattle) return;

    // Register or promote host accounts in producerService
    hostEntries.forEach((h) => {
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
      hosts: hostEntries.map((h) => h.name),
      hostDetails: hostEntries,
      judges: judgeEntries.map((j) => j.name),
      judgeDetails: judgeEntries,
      samples: samples,
      rules: extraRules,
    };

    await battleService.updateBattle(updated.id, updated);
    setBattles(battleService.getAllBattles());
    setIsSaved(true);
    setTimeout(() => {
      setEditingBattle(null);
      setIsSaved(false);
    }, 800);
  };

  return (
    <AdminGuard>
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300 py-4">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs text-[#888888] hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Admin Panel</span>
            </Link>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <Trophy className="w-7 h-7 text-brand" />
              <span>Edit Battle(s)</span>
            </h1>
            <p className="text-xs text-zinc-400">
              Manage battle covers, samples, deadlines, and assign host & judge accounts.
            </p>
          </div>

          <Link
            href="/admin/new-battle"
            className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand/90 text-xs font-bold text-white transition-all shadow-md active:scale-95 flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Battle</span>
          </Link>
        </div>

        {/* Battles List */}
        <div className="space-y-3.5">
          {battles.map((battle) => (
            <div
              key={battle.id}
              className="bg-surface-card rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg hover:bg-surface-hover transition-all"
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
                    <h3 className="text-sm font-bold text-white truncate">{battle.title}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      battle.phase === "completed"
                        ? "bg-zinc-800 text-zinc-400"
                        : "bg-brand/20 text-brand"
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
                  className="px-4 py-2 rounded-xl bg-[#222222] hover:bg-brand hover:text-white text-xs font-semibold text-zinc-300 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <Link
                  href={`/battles/${battle.id}`}
                  className="px-4 py-2 rounded-xl bg-[#181818] hover:bg-[#252525] text-xs font-semibold text-zinc-400 hover:text-white transition-all"
                >
                  View Public
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* EDIT BATTLE MODAL */}
        {editingBattle && (
          <div
            onClick={() => setEditingBattle(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#181818] rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto cursor-default"
            >
              <div className="flex items-center justify-between pb-2">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-brand" />
                  <span>Edit Battle #{editingBattle.number}</span>
                </h3>
                <button
                  onClick={() => setEditingBattle(null)}
                  className="w-8 h-8 rounded-full bg-[#121212] text-zinc-400 hover:text-white flex items-center justify-center text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5 text-xs sm:text-sm">
                
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-300">Battle Title</label>
                  <input
                    type="text"
                    value={editingBattle.title}
                    onChange={(e) => setEditingBattle({ ...editingBattle, title: e.target.value })}
                    className="w-full bg-[#121212] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>

                {/* Phase Status */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-300">Current Phase</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(["submission", "rating", "judging", "completed"] as BattlePhase[]).map((phase) => (
                      <button
                        key={phase}
                        type="button"
                        onClick={() => setEditingBattle({ ...editingBattle, phase })}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          editingBattle.phase === phase
                            ? "bg-brand text-white shadow-md"
                            : "bg-[#121212] text-zinc-400 hover:text-white"
                        }`}
                      >
                        {phase === "submission"
                          ? "Phase 1: Submit"
                          : phase === "rating"
                          ? "Phase 2: Rating"
                          : phase === "judging"
                          ? "Phase 3: Jury"
                          : "Phase 4: Results"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cover Image */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-300">Cover Artwork</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#121212] relative shrink-0">
                      <Image
                        src={editingBattle.coverImage}
                        alt="Cover"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="px-4 py-2 rounded-xl bg-[#121212] hover:bg-[#202020] text-xs font-semibold text-zinc-300 cursor-pointer inline-flex items-center gap-2 transition-colors">
                        <Upload className="w-3.5 h-3.5 text-brand" />
                        <span>Upload New Cover</span>
                        <input type="file" accept="image/*" onChange={handleCoverFileChange} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Hosted by */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-zinc-300">Host</label>
                    <span className="text-[10px] text-zinc-500">Google accounts unlock Host Panel</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {hostEntries.map((host, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl bg-[#121212] text-xs font-medium text-white shadow-sm"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold">{host.name}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">({host.email})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setHostEntries([])}
                          className="w-4 h-4 rounded-full bg-[#262626] text-zinc-400 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {showAddHost ? (
                    <div className="bg-[#121212] p-3.5 rounded-xl space-y-2.5 animate-in fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Host Name (e.g. Nerub)"
                          value={hostNameInput}
                          onChange={(e) => setHostNameInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddHost();
                            }
                          }}
                          className="bg-[#181818] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
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
                          className="bg-[#181818] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
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
                          className="px-4 py-1.5 rounded-lg bg-brand hover:bg-brand/90 text-xs text-white font-bold cursor-pointer disabled:opacity-50"
                        >
                          Set Host
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddHost(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#121212] hover:bg-[#202020] text-xs text-[#D1D1D1] font-semibold transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-brand" />
                      <span>{hostEntries.length > 0 ? "Change Host" : "Assign Host"}</span>
                    </button>
                  )}
                </div>

                {/* Judged by */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-zinc-300">Judges</label>
                    <span className="text-[10px] text-zinc-500">Google accounts unlock Jury Portal</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {judgeEntries.map((judge, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl bg-[#121212] text-xs font-medium text-white shadow-sm"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold">{judge.name}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">({judge.email})</span>
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
                    <div className="bg-[#121212] p-3.5 rounded-xl space-y-2.5 animate-in fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Judge Name (e.g. Vlad Dobrescu)"
                          value={judgeNameInput}
                          onChange={(e) => setJudgeNameInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddJudge();
                            }
                          }}
                          className="bg-[#181818] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
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
                          className="bg-[#181818] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
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
                          className="px-4 py-1.5 rounded-lg bg-brand hover:bg-brand/90 text-xs text-white font-bold cursor-pointer disabled:opacity-50"
                        >
                          Assign Judge
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddJudge(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#121212] hover:bg-[#202020] text-xs text-[#D1D1D1] font-semibold transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-brand" />
                      <span>Add Judge</span>
                    </button>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-300">Description</label>
                  <textarea
                    rows={3}
                    value={editingBattle.description}
                    onChange={(e) => setEditingBattle({ ...editingBattle, description: e.target.value })}
                    className="w-full bg-[#121212] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                  />
                </div>

                {/* Rules */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-zinc-300 block">Rules</label>
                    <span className="text-[10px] text-zinc-500">Default + Custom battle rules</span>
                  </div>

                  <div className="bg-[#121212] p-3.5 rounded-xl space-y-1.5 text-xs text-zinc-400">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                      Standard Default Rules:
                    </span>
                    <p>1. Maximum 1 entry per producer.</p>
                    <p>2. Track length must not exceed 3 minutes.</p>
                    <p>3. File type must be WAV or MP3.</p>
                    <p>4. Use at least 1 of the samples (if) provided.</p>
                  </div>

                  {/* Extra Rules List */}
                  {extraRules.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                        Extra Custom Rules:
                      </span>
                      {extraRules.map((rule, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#121212] text-xs text-white"
                        >
                          <span>{idx + 5}. {rule.replace(/^\d+\.\s*/, "")}</span>
                          <button
                            type="button"
                            onClick={() => setExtraRules(extraRules.filter((_, i) => i !== idx))}
                            className="w-5 h-5 rounded-full bg-[#262626] text-zinc-400 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {showAddRule ? (
                    <div className="bg-[#121212] p-3 rounded-xl space-y-2">
                      <input
                        type="text"
                        placeholder="e.g. Must feature an 808 sub-bassline"
                        value={newRuleInput}
                        onChange={(e) => setNewRuleInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddRule();
                          }
                        }}
                        className="w-full bg-[#181818] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAddRule(false)}
                          className="px-3 py-1.5 text-xs text-[#888888] hover:text-white cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleAddRule}
                          disabled={!newRuleInput.trim()}
                          className="px-3.5 py-1.5 rounded-lg bg-brand hover:bg-brand/90 text-xs text-white font-bold cursor-pointer disabled:opacity-50"
                        >
                          Add Rule
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddRule(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#121212] hover:bg-[#202020] text-xs text-[#D1D1D1] font-semibold transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-brand" />
                      <span>Add Extra Rule</span>
                    </button>
                  )}
                </div>

                {/* Sample(s) Management (Upload file only, clean row without audio player) */}
                <div className="space-y-3 bg-[#121212] p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-white uppercase tracking-wider text-[11px]">
                      Sample(s)
                    </label>
                    <span className="text-[10px] text-zinc-400">
                      Audio files competitors must flip
                    </span>
                  </div>

                  {samples.length > 0 && (
                    <div className="space-y-2">
                      {samples.map((sample) => (
                        <div
                          key={sample.id}
                          className="bg-[#181818] p-3 rounded-xl flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-7 h-7 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
                              <Music className="w-3.5 h-3.5" />
                            </div>
                            <input
                              type="text"
                              value={sample.title}
                              onChange={(e) => handleUpdateSampleTitle(sample.id, e.target.value)}
                              className="bg-transparent text-xs text-white font-medium focus:outline-none focus:ring-1 focus:ring-brand rounded px-1.5 py-0.5 w-full"
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
                    <label className="px-4 py-2 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-xs font-bold text-white cursor-pointer transition-colors inline-flex items-center gap-2">
                      <Music className="w-3.5 h-3.5 text-brand" />
                      <span>Upload Audio Sample(s)</span>
                      <input
                        type="file"
                        multiple
                        accept="audio/mp3,audio/wav,audio/*"
                        onChange={handleSampleFilesUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Timeline Deadlines */}
                <div className="bg-[#121212] p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-white uppercase tracking-wider text-[11px]">
                      Timeline & Deadlines
                    </label>
                    <span className="text-[10px] text-zinc-400">
                      Active phase is automatically calculated from dates
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400">Start Date</label>
                      <input
                        type="datetime-local"
                        value={editingBattle.submissionStartsAt ? editingBattle.submissionStartsAt.slice(0, 16) : ""}
                        onChange={(e) =>
                          setEditingBattle({
                            ...editingBattle,
                            submissionStartsAt: e.target.value ? new Date(e.target.value).toISOString() : "",
                          })
                        }
                        className="w-full bg-[#181818] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400">Submission Deadline</label>
                      <input
                        type="datetime-local"
                        value={editingBattle.submissionEndsAt ? editingBattle.submissionEndsAt.slice(0, 16) : ""}
                        onChange={(e) =>
                          setEditingBattle({
                            ...editingBattle,
                            submissionEndsAt: e.target.value ? new Date(e.target.value).toISOString() : "",
                          })
                        }
                        className="w-full bg-[#181818] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400">Rating Deadline</label>
                      <input
                        type="datetime-local"
                        value={editingBattle.ratingEndsAt ? editingBattle.ratingEndsAt.slice(0, 16) : ""}
                        onChange={(e) =>
                          setEditingBattle({
                            ...editingBattle,
                            ratingEndsAt: e.target.value ? new Date(e.target.value).toISOString() : "",
                          })
                        }
                        className="w-full bg-[#181818] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Battle</span>
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingBattle(null)}
                      className="px-5 py-2.5 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-7 py-2.5 rounded-xl bg-brand hover:bg-brand/90 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      {isSaved ? "Saved ✓" : "Save Changes"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {showDeleteConfirm && editingBattle && (
          <div
            onClick={() => setShowDeleteConfirm(false)}
            className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#181818] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-left cursor-default"
            >
              <div className="flex items-center gap-3 text-red-400">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Delete {editingBattle.title}?</h4>
                  <p className="text-xs text-zinc-400">This action will remove the battle from the platform.</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteBattle}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white transition-all shadow-md cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminGuard>
  );
}
