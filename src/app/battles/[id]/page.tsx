import React from "react";
import { battleService } from "@/services/battleService";
import { BattleDetailClient } from "@/components/BattleDetailClient";

export const dynamicParams = false;

export function generateStaticParams() {
  const existing = battleService.getAllCompetitions().map((b) => ({ id: b.id }));
  const buffer = Array.from({ length: 50 }, (_, i) => ({ id: `battle-${i + 1}` }));
  const allIds = Array.from(new Set([...existing.map((e) => e.id), ...buffer.map((b) => b.id)]));
  return allIds.map((id) => ({ id }));
}

export default async function BattleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BattleDetailClient battleId={id} />;
}
