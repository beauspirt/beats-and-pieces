import React from "react";
import { sampleCompetitions } from "@/lib/mock-data";
import { BattleDetailClient } from "@/components/BattleDetailClient";

export function generateStaticParams() {
  return sampleCompetitions.map((b) => ({
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
