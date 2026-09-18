import type { Metadata } from "next";
import { buildOgMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildOgMetadata({
  title: "Beats",
  description: "Discover beats from Romanian producers. Browse, listen, and find your next favorite beat.",
  path: "/beats",
});

export default function BeatsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
