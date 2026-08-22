import React from "react";
import { battleService } from "@/services/battleService";
import { BattleDetailClient } from "@/components/BattleDetailClient";

export function generateStaticParams() {
  return battleService.getAllCompetitions().map((b) => ({
    id: b.id,
  }));
}

export default async function BattleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BattleDetailClient battleId={id} />;
}
