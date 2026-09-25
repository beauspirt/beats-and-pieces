import React, { Suspense } from "react";
import type { Metadata } from "next";
import { producerService } from "@/services/producerService";
import { buildOgMetadata } from "@/lib/metadata";
import { BeatDetailClient } from "@/components/BeatDetailClient";

export const dynamicParams = false;

export function generateStaticParams() {
  const reserved = ["admin", "api", "auth", "battles", "beats", "host", "profile", "releases", "signin", "vault", "producers"];
  const allProducers = producerService.getAllProducers();
  const paths = new Set<string>();

  allProducers.forEach((p) => {
    if (p.id && !reserved.includes(p.id)) {
      paths.add(p.id);
    }
    if (p.handle && !reserved.includes(p.handle)) {
      paths.add(p.handle);
    }
  });

  return Array.from(paths).map((id) => ({
    id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const producer = producerService.getProducerById(id) || producerService.getProducerByTag(id);

  if (!producer) return {};

  const name = producer.nickname || producer.id;
  const title = `Beat by ${name}`;
  const description = `Listen to this beat by ${name} on Beats & Pieces.`;
  
  const hasCustomAvatar =
    producer.avatarUrl &&
    !producer.avatarUrl.includes("default-avatar") &&
    producer.avatarUrl.trim() !== "";
  const ogImage = hasCustomAvatar ? producer.avatarUrl : undefined;

  return buildOgMetadata({
    title,
    description,
    image: ogImage,
    path: `/${id}/beat`, // OpenGraph doesn't render search params statically, so this points to the generic beat page for the producer
  });
}

export default async function ProducerBeatPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-[#FF5E3A] border-t-transparent animate-spin" /></div>}>
      <BeatDetailClient />
    </Suspense>
  );
}
