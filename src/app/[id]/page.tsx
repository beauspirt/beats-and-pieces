import React from "react";
import { producerService } from "@/services/producerService";
import { ProducerProfileClient } from "@/components/ProducerProfileClient";

export const dynamicParams = false;

export function generateStaticParams() {
  const reserved = ["admin", "api", "auth", "battles", "beats", "host", "profile", "releases", "signin", "vault", "producers"];
  const allProducers = producerService.getAllProducers();
  return allProducers
    .filter((p) => p.id && !reserved.includes(p.id))
    .map((p) => ({
      id: p.id,
    }));
}

export default async function ProducerDirectProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProducerProfileClient producerId={id} />;
}
