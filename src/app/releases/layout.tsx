import type { Metadata } from "next";
import { buildOgMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildOgMetadata({
  title: "Releases",
  description: "Official releases from the Beats & Pieces community. Tapes, compilations, and collaborative projects.",
  path: "/releases",
});

export default function ReleasesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
