import React from "react";
import type { Metadata } from "next";
import { producerService } from "@/services/producerService";
import { ProducerProfileClient } from "@/components/ProducerProfileClient";
import { buildOgMetadata, DEFAULT_OG_IMAGE } from "@/lib/metadata";

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
  const producer = producerService.getProducerById(id);

  if (!producer) return {};

  const name = producer.nickname || producer.id;
  const hasCustomAvatar =
    producer.avatarUrl &&
    !producer.avatarUrl.includes("default-avatar") &&
    producer.avatarUrl.trim() !== "";
  const ogImage = hasCustomAvatar ? producer.avatarUrl : DEFAULT_OG_IMAGE;

  return buildOgMetadata({
    title: name,
    description: `${name}'s profile on Beats & Pieces`,
    image: ogImage,
    path: `/${id}`,
  });
}

export default async function ProducerDirectProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProducerProfileClient producerId={id} />;
}
