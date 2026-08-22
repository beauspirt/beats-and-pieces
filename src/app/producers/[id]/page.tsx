import React from "react";
import { producerService } from "@/services/producerService";
import { ProducerProfileClient } from "@/components/ProducerProfileClient";

export function generateStaticParams() {
  return producerService.getAllProducers().map((p) => ({
    id: p.id,
  }));
}

export const dynamicParams = true;

export default async function ProducerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProducerProfileClient producerId={id} />;
}
