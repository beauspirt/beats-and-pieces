"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

export default function NewCompetitionPage() {
  const router = useRouter();
  const [title, setTitle] = useState("Romanian Hip-Hop Flip Challenge");
  const [hosts, setHosts] = useState<string[]>(["Nerub"]);
  const [newHostInput, setNewHostInput] = useState("");
  const [showAddHost, setShowAddHost] = useState(false);

  const [judges, setJudges] = useState<string[]>(["Nerub", "Deliric", "Vlad Flueraru"]);
  const [newJudgeInput, setNewJudgeInput] = useState("");
  const [showAddJudge, setShowAddJudge] = useState(false);

  const [description, setDescription] = useState(
    "Sample the provided Romanian vinyl chops and build your best boom bap / hip-hop groove. Maximum length 2 minutes."
  );
  const [extraRules, setExtraRules] = useState<string[]>([]);
  const [newRuleInput, setNewRuleInput] = useState("");
  const [showAddRule, setShowAddRule] = useState(false);

  const handleAddRule = () => {
    if (newRuleInput.trim()) {
      setExtraRules([...extraRules, newRuleInput.trim()]);
      setNewRuleInput("");
      setShowAddRule(false);
    }
  };
  const [startDate, setStartDate] = useState("YYYY-MM-DD HH:MM:SS");
  const [submissionDeadline, setSubmissionDeadline] = useState("YYYY-MM-DD HH:MM:SS");
  const [ratingDeadline, setRatingDeadline] = useState("YYYY-MM-DD HH:MM:SS");
  const [isSaved, setIsSaved] = useState(false);

  const handleAddHost = () => {
    if (newHostInput.trim()) {
      setHosts([...hosts, newHostInput.trim()]);
      setNewHostInput("");
      setShowAddHost(false);
    }
  };

  const handleAddJudge = () => {
    if (newJudgeInput.trim()) {
      setJudges([...judges, newJudgeInput.trim()]);
      setNewJudgeInput("");
      setShowAddJudge(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => {
      router.push("/battles");
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300 py-4">
      
      {/* Title */}
      <div className="pb-2">
        <h1 className="text-3xl font-black text-white">Create a new competition</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* CONTAINER: DETAILS */}
        <div className="bg-[#181818] rounded-2xl p-6 sm:p-8 space-y-6">
          <h2 className="text-lg font-bold text-white">Details</h2>

          {/* Title */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <label className="sm:col-span-3 text-sm font-semibold text-[#D1D1D1]">
              Title
            </label>
            <div className="sm:col-span-9">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#121212] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
                required
              />
            </div>
          </div>

          {/* Image */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <label className="sm:col-span-3 text-sm font-semibold text-[#D1D1D1]">
              Image
            </label>
            <div className="sm:col-span-9">
              <div className="rounded-xl p-3 bg-[#121212] flex items-center justify-between">
                <span className="text-xs text-[#777777]">Choose file</span>
                <label className="px-4 py-1.5 rounded-lg bg-[#222222] hover:bg-[#2A2A2A] text-xs font-bold text-white cursor-pointer transition-colors">
                  Browse
                  <input type="file" accept="image/*" className="hidden" />
                </label>
              </div>
            </div>
          </div>

          {/* Hosted by */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <label className="sm:col-span-3 text-sm font-semibold text-[#D1D1D1]">
              Hosted by
            </label>
            <div className="sm:col-span-9 flex flex-wrap items-center gap-2">
              {hosts.map((host, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl bg-[#121212] text-xs font-medium text-white"
                >
                  <span>{host}</span>
                  <button
                    type="button"
                    onClick={() => setHosts(hosts.filter((_, i) => i !== idx))}
                    className="w-4 h-4 rounded-full bg-[#7B61FF] text-white flex items-center justify-center hover:bg-[#684DE6] transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}

              {showAddHost ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Host..."
                    value={newHostInput}
                    onChange={(e) => setNewHostInput(e.target.value)}
                    className="bg-[#121212] rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddHost}
                    className="px-2.5 py-1 rounded-lg bg-[#7B61FF] text-xs text-white font-medium"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddHost(true)}
                  className="w-7 h-7 rounded-full bg-[#7B61FF] text-white flex items-center justify-center hover:bg-[#684DE6] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Judged by */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <label className="sm:col-span-3 text-sm font-semibold text-[#D1D1D1]">
              Judged by
            </label>
            <div className="sm:col-span-9 flex flex-wrap items-center gap-2">
              {judges.map((judge, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl bg-[#121212] text-xs font-medium text-white"
                >
                  <span>{judge}</span>
                  <button
                    type="button"
                    onClick={() => setJudges(judges.filter((_, i) => i !== idx))}
                    className="w-4 h-4 rounded-full bg-[#7B61FF] text-white flex items-center justify-center hover:bg-[#684DE6] transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}

              {showAddJudge ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Judge..."
                    value={newJudgeInput}
                    onChange={(e) => setNewJudgeInput(e.target.value)}
                    className="bg-[#121212] rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddJudge}
                    className="px-2.5 py-1 rounded-lg bg-[#7B61FF] text-xs text-white font-medium"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddJudge(true)}
                  className="w-7 h-7 rounded-full bg-[#7B61FF] text-white flex items-center justify-center hover:bg-[#684DE6] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
            <label className="sm:col-span-3 text-sm font-semibold text-[#D1D1D1] pt-2">
              Description
            </label>
            <div className="sm:col-span-9">
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#121212] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF] resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Extra Rules */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
            <div className="sm:col-span-3 pt-1.5">
              <label className="text-sm font-semibold text-[#D1D1D1] block">
                Extra Rules
              </label>
              <span className="text-[11px] text-[#888888] block">Added to default rules</span>
            </div>
            <div className="sm:col-span-9 space-y-2.5">
              {extraRules.map((rule, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 pl-3.5 pr-2 py-2 rounded-xl bg-[#121212] text-xs text-white"
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
                    placeholder="e.g. Include at least 1 vinyl scratch..."
                    value={newRuleInput}
                    onChange={(e) => setNewRuleInput(e.target.value)}
                    className="flex-1 bg-[#121212] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddRule}
                    className="px-3.5 py-2 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-xs text-white font-bold cursor-pointer"
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
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#121212] hover:bg-[#202020] text-xs text-[#D1D1D1] font-semibold transition-all border border-[#222222] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#7B61FF]" />
                  <span>Add Extra Rule</span>
                </button>
              )}
            </div>
          </div>

          {/* Sample(s) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <label className="sm:col-span-3 text-sm font-semibold text-[#D1D1D1]">
              Sample(s)
            </label>
            <div className="sm:col-span-9">
              <div className="rounded-xl p-3 bg-[#121212] flex items-center justify-between">
                <span className="text-xs text-[#777777]">Choose file(s)</span>
                <label className="px-4 py-1.5 rounded-lg bg-[#222222] hover:bg-[#2A2A2A] text-xs font-bold text-white cursor-pointer transition-colors">
                  Browse
                  <input type="file" multiple accept="audio/wav,audio/mp3" className="hidden" />
                </label>
              </div>
            </div>
          </div>

          {/* Start date */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <label className="sm:col-span-3 text-sm font-semibold text-[#D1D1D1]">
              Start date
            </label>
            <div className="sm:col-span-9">
              <input
                type="text"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#121212] rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
              />
            </div>
          </div>

          {/* Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <label className="sm:col-span-3 text-sm font-semibold text-[#D1D1D1]">
              Deadline
            </label>
            <div className="sm:col-span-9">
              <input
                type="text"
                value={submissionDeadline}
                onChange={(e) => setSubmissionDeadline(e.target.value)}
                className="w-full bg-[#121212] rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
              />
            </div>
          </div>

          {/* Rating Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <label className="sm:col-span-3 text-sm font-semibold text-[#D1D1D1]">
              Rating Deadline
            </label>
            <div className="sm:col-span-9">
              <input
                type="text"
                value={ratingDeadline}
                onChange={(e) => setRatingDeadline(e.target.value)}
                className="w-full bg-[#121212] rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
              />
            </div>
          </div>

        </div>

        {/* Bottom Save Button */}
        <div className="text-right pt-2">
          <button
            type="submit"
            className="px-10 py-3 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white text-sm font-bold transition-all shadow-lg active:scale-95 ml-auto"
          >
            {isSaved ? "Saved ✓" : "Save"}
          </button>
        </div>

      </form>

    </div>
  );
}
