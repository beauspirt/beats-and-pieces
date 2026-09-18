import type { Metadata } from "next";

export const SITE_URL = "https://beatsandpieces.ro";

export const DEFAULT_OG_IMAGE = "/og-default.png";

const DEFAULT_DESCRIPTION =
  "The home of Romanian beatmakers. Beat battles, public rating, releases, and beats discovery.";

/**
 * Build a complete Metadata object with Open Graph + Twitter Card tags.
 * Relative image paths are resolved automatically by Next.js via metadataBase.
 */
export function buildOgMetadata({
  title,
  description,
  image,
  path,
}: {
  title: string;
  description?: string;
  image?: string;
  path?: string;
}): Metadata {
  const ogTitle = `${title} | Beats & Pieces`;
  const desc = description || DEFAULT_DESCRIPTION;
  const ogImage = image || DEFAULT_OG_IMAGE;

  return {
    title,
    description: desc,
    openGraph: {
      title: ogTitle,
      description: desc,
      siteName: "Beats & Pieces",
      type: "website",
      ...(path ? { url: `${SITE_URL}${path}` } : {}),
      images: [
        {
          url: ogImage,
          alt: ogTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: desc,
      images: [ogImage],
    },
  };
}
