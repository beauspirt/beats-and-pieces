import type { Metadata } from "next";
import { buildOgMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildOgMetadata({
  title: "Battles",
  description: "Browse all Beats & Pieces beat battles. Listen to submissions, vote on your favorites, and see the results.",
  path: "/battles",
});

export default function BattlesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
