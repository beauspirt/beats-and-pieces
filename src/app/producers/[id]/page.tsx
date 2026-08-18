import React from "react";
import { sampleProducers } from "@/lib/mock-data";
import { ProducerProfileClient } from "@/components/ProducerProfileClient";

export function generateStaticParams() {
  return Object.keys(sampleProducers).map((id) => ({
    id,
  }));
}

export default async function ProducerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProducerProfileClient producerId={id} />;
}
