import type { Metadata } from "next";
import { buildOgMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildOgMetadata({
  title: "The Vault",
  description: "Beat breakdowns, live sets, and exclusive content from the Beats & Pieces community.",
  path: "/vault",
});

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return children;
}
