"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Check } from "lucide-react";
import { producerService } from "@/services/producerService";
import { useAuth } from "@/lib/auth-context";
import { AdminGuard } from "@/components/AdminGuard";

export default function AdminAccountsPage() {
  const router = useRouter();
  const { user, loginWithUser } = useAuth();

  // Search, Sort & Pagination states for Accounts
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"alpha" | "date">("alpha");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(15);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  // Close sorting dropdown on outside click
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

  const [producersList, setProducersList] = useState(() => producerService.getAllProducers());

  useEffect(() => {
    const handleUpdate = () => {
      setProducersList(producerService.getAllProducers());
    };
    window.addEventListener("bnp_producers_updated", handleUpdate);
    producerService.syncFromSupabase().then(() => {
      setProducersList(producerService.getAllProducers());
    });
    return () => window.removeEventListener("bnp_producers_updated", handleUpdate);
  }, []);

  const filteredAndSortedProducers = useMemo(() => {
    let list = producersList.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const name = (p.nickname || "").toLowerCase();
      const handle = (p.handle || "").toLowerCase();
      const email = (p.email || "").toLowerCase();
      const id = (p.id || "").toLowerCase();
      return name.includes(q) || handle.includes(q) || email.includes(q) || id.includes(q);
    });

    if (sortBy === "alpha") {
      list.sort((a, b) => (a.nickname || a.id).localeCompare(b.nickname || b.id));
    } else if (sortBy === "date") {
      list.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    }

    return list;
  }, [producersList, searchQuery, sortBy]);

  const visibleProducers = useMemo(() => {
    return filteredAndSortedProducers.slice(0, visibleCount);
  }, [filteredAndSortedProducers, visibleCount]);

  return (
    <AdminGuard>
      <div className="w-full space-y-8 animate-in fade-in duration-300">
        {/* Header */}
        <div className="space-y-2">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-[#888888] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Admin Panel</span>
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Accounts
          </h1>
        </div>

        {/* ACCOUNTS SECTION */}
        <div className="bg-surface-card rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs text-zinc-400 font-medium">
              {filteredAndSortedProducers.length} Accounts {searchQuery ? "Found" : "Available"}
            </span>
          </div>

          {/* Search Field & Sorting Control */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleCount(15);
                }}
                placeholder="Search accounts by nickname, handle, email, or id..."
                className="w-full h-9 px-4 bg-[#141414] rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:bg-[#1a1a1a] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Sorting Dropdown */}
            <div className="relative" ref={sortMenuRef}>
              <button
                type="button"
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="w-full sm:w-auto h-9 px-4 rounded-2xl bg-[#141414] hover:bg-[#1a1a1a] text-xs font-semibold text-zinc-300 hover:text-white transition-colors flex items-center justify-between gap-2 cursor-pointer"
              >
                <span>
                  Sort: {sortBy === "alpha" ? "Alphabetical (A-Z)" : "Date Created (Newest)"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              </button>

              {isSortOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-[#181818] rounded-2xl p-1.5 shadow-2xl z-30 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy("alpha");
                      setIsSortOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      sortBy === "alpha"
                        ? "bg-brand text-white shadow-sm"
                        : "text-zinc-400 hover:text-white hover:bg-[#222222]"
                    }`}
                  >
                    <span>Alphabetical (A-Z)</span>
                    {sortBy === "alpha" && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSortBy("date");
                      setIsSortOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      sortBy === "date"
                        ? "bg-brand text-white shadow-sm"
                        : "text-zinc-400 hover:text-white hover:bg-[#222222]"
                    }`}
                  >
                    <span>Date Created (Newest)</span>
                    {sortBy === "date" && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Accounts List */}
          <div className="space-y-1 pt-1">
            {visibleProducers.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500">
                No accounts match "{searchQuery}".
              </div>
            ) : (
              visibleProducers.map((prod) => {
                const publicHref = `/${prod.handle || prod.id}`;
                const formattedDate = prod.createdAt && !prod.createdAt.startsWith("2021-") && !prod.createdAt.startsWith("2022-") && !prod.createdAt.startsWith("2023-")
                  ? new Date(prod.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : null;

                const isCurrentActive = user?.id === prod.id;

                return (
                  <div
                    key={prod.id}
                    className="py-2.5 px-3 -mx-3 flex items-center justify-between gap-4 group/row rounded-xl hover:bg-white/[0.03] transition-colors"
                  >
                    <Link
                      href={publicHref}
                      className="flex items-center gap-3.5 flex-1 min-w-0 group cursor-pointer"
                    >
                      {/* Avatar Thumbnail */}
                      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-[#1e1e1e] border border-white/5 relative shadow-inner">
                        <img
                          src={prod.avatarUrl || "/images/avatars/default-avatar.png"}
                          alt={prod.nickname || "User"}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = "/images/avatars/default-avatar.png";
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-0 space-y-0.5">
                        <span className="text-sm font-bold text-white group-hover:text-brand transition-colors block truncate">
                          {prod.nickname}
                        </span>
                        <span className="text-xs text-zinc-400 block truncate">
                          {prod.email}
                        </span>
                        {formattedDate && (
                          <span className="text-xs text-zinc-500 block truncate">
                            Date created: {formattedDate}
                          </span>
                        )}
                      </div>
                    </Link>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        loginWithUser(prod.id);
                        router.push("/");
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                        isCurrentActive
                          ? "bg-[#7B61FF]/20 text-[#7B61FF] font-bold"
                          : "bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white"
                      }`}
                    >
                      {isCurrentActive ? "Logged In" : "Log in as account"}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Load More Button */}
          {visibleCount < filteredAndSortedProducers.length && (
            <div className="pt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 15)}
                className="px-6 py-2 rounded-2xl bg-[#141414] hover:bg-[#1c1c1c] text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                Load More ({filteredAndSortedProducers.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
