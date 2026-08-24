"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { vaultService } from "@/services/vaultService";
import { producerService } from "@/services/producerService";
import { VaultItem } from "@/lib/types";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { ClientPortal } from "@/components/ClientPortal";

export default function VaultPage() {
  const [activeModalItem, setActiveModalItem] = useState<VaultItem | null>(null);

  // Lock page scrolling when vault video modal is open
  useBodyScrollLock(Boolean(activeModalItem));

  const breakdowns = vaultService.getItemsByCategory("breakdowns");
  const liveSets = vaultService.getItemsByCategory("live-sets");

  const renderCard = (item: VaultItem) => {
    const prod = item.producerId
      ? producerService.getProducerById(item.producerId)
      : item.producerTag
      ? producerService.getProducerByTag(item.producerTag)
      : null;

    const thumbnailUrl = `https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg`;

    return (
      <div
        key={item.id}
        className="bg-[#181818] rounded-2xl overflow-hidden flex flex-col justify-between group hover:bg-[#1f1f1f] transition-colors duration-200 shadow-lg"
      >
        {/* Thumbnail Preview Area */}
        <div
          onClick={() => setActiveModalItem(item)}
          className="w-full aspect-video relative bg-[#121212] overflow-hidden cursor-pointer select-none"
        >
          <Image
            src={thumbnailUrl}
            alt={item.title}
            fill
            className="object-cover opacity-90 group-hover:opacity-100 transition-opacity"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>

        {/* Card Content & Actions */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
          <h3
            onClick={() => setActiveModalItem(item)}
            className="text-base sm:text-lg font-bold text-white leading-snug cursor-pointer"
          >
            {item.title}
          </h3>

          {/* Footer: Producer info & External Link */}
          <div className="flex items-center justify-between gap-3 pt-1">
            {prod ? (
              <Link
                href={`/${prod.id}`}
                className="flex items-center gap-2 group/prod text-xs font-semibold text-zinc-300 hover:text-white truncate"
              >
                <div className="w-6 h-6 rounded-full overflow-hidden relative shrink-0 bg-[#222222]">
                  <Image
                    src={prod.avatarUrl || "/avatars/default-avatar.png"}
                    alt={prod.nickname}
                    fill
                    className="object-cover"
                  />
                </div>
                <span className="truncate group-hover/prod:text-[#7B61FF] transition-colors">
                  {prod.nickname}
                </span>
              </Link>
            ) : item.producerTag ? (
              <span className="text-xs text-zinc-400 font-semibold truncate">
                {item.producerTag}
              </span>
            ) : item.venue ? (
              <span className="text-xs text-zinc-400 font-medium truncate">
                {item.venue}
              </span>
            ) : (
              <div />
            )}

            <a
              href={item.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-[#222222] hover:bg-[#2c2c2c] text-zinc-400 hover:text-white text-xs transition-colors inline-flex items-center gap-1 shrink-0"
              title="Watch on YouTube"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">The Vault</h1>
        <p className="text-sm text-zinc-400">
          Exclusive track breakdowns, live sets, and studio archives from the community.
        </p>
      </div>

      {/* Breakdowns Section */}
      <section className="space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
          Track Breakdowns
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {breakdowns.map(renderCard)}
        </div>
      </section>

      {/* Live Sets Section */}
      <section className="space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
          Live Sets
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {liveSets.map(renderCard)}
        </div>
      </section>

      {/* In-App Video Modal Player */}
      <ClientPortal>
        {activeModalItem && (
          <div
            onClick={() => setActiveModalItem(null)}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#181818] rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl space-y-4 p-4 sm:p-6 relative cursor-default"
            >
              {/* Modal Close Button */}
              <div className="flex items-center justify-end">
                <button
                  onClick={() => setActiveModalItem(null)}
                  className="w-8 h-8 rounded-full bg-[#121212] text-zinc-400 hover:text-white flex items-center justify-center text-sm cursor-pointer shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* Embedded 16:9 YouTube Player */}
              <div className="w-full aspect-video rounded-xl overflow-hidden bg-black relative shadow-inner">
                <iframe
                  src={`https://www.youtube.com/embed/${activeModalItem.youtubeId}?autoplay=1`}
                  title={activeModalItem.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end pt-1 text-xs">
                <a
                  href={activeModalItem.youtubeUrl}
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
      </ClientPortal>

    </div>
  );
}
