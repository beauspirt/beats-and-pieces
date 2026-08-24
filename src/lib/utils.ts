import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function normalizeUrl(url: string, platform?: string): string {
  if (!url) return "";
  let trimmed = url.trim();
  if (!trimmed) return "";

  // If already starts with http:// or https://
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Handle specific platforms if user typed just a handle/username
  if (platform) {
    const cleanHandle = trimmed.replace(/^@/, "");
    const lowerPlatform = platform.toLowerCase();
    
    // Check if trimmed already contains a domain name or dot
    if (!trimmed.includes(".")) {
      switch (lowerPlatform) {
        case "instagram":
          return `https://www.instagram.com/${cleanHandle}`;
        case "facebook":
          return `https://www.facebook.com/${cleanHandle}`;
        case "youtube":
          return `https://www.youtube.com/@${cleanHandle}`;
        case "spotify":
          return `https://open.spotify.com/artist/${cleanHandle}`;
        case "bandcamp":
          return `https://${cleanHandle}.bandcamp.com`;
        case "soundcloud":
          return `https://soundcloud.com/${cleanHandle}`;
        case "beatstars":
          return `https://www.beatstars.com/${cleanHandle}`;
        default:
          return `https://${cleanHandle}`;
      }
    }
  }

  // Strip leading protocols if any was malformed
  trimmed = trimmed.replace(/^https?:\/\//i, "");

  // If already starts with www.
  if (trimmed.toLowerCase().startsWith("www.")) {
    return `https://${trimmed}`;
  }

  // Check hostname part before path or query
  const hostPart = trimmed.split(/[\/?#]/)[0];
  const dots = (hostPart.match(/\./g) || []).length;

  // Standard 1-dot domain (e.g. instagram.com, facebook.com, youtube.com, beatstars.com, nerub.com)
  if (dots === 1) {
    return `https://www.${trimmed}`;
  }

  // Multi-dot domain or custom subdomain (e.g. open.spotify.com, artist.bandcamp.com)
  return `https://${trimmed}`;
}

