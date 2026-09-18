import React from "react";
import type { Metadata } from "next";
import { battleService } from "@/services/battleService";
import { BattleDetailClient } from "@/components/BattleDetailClient";
import { buildOgMetadata, DEFAULT_OG_IMAGE } from "@/lib/metadata";

export const dynamicParams = false;

export function generateStaticParams() {
  const existing = battleService.getAllCompetitions().map((b) => ({ id: b.id }));
  const buffer = Array.from({ length: 50 }, (_, i) => ({ id: `battle-${i + 1}` }));
  const allIds = Array.from(new Set([...existing.map((e) => e.id), ...buffer.map((b) => b.id)]));
  return allIds.map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const battle = battleService.getCompetitionById(id);

  if (!battle) return {};

  return buildOgMetadata({
    title: battle.title,
    description: battle.description || `Check out ${battle.title} on Beats & Pieces`,
    image: battle.coverImage || DEFAULT_OG_IMAGE,
    path: `/battles/${id}`,
  });
}

export default async function BattleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BattleDetailClient battleId={id} />;
}
