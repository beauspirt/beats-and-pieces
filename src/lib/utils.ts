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

/**
 * Automatically formats user input links into https://www. format
 * e.g. "instagram.com/user" -> "https://www.instagram.com/user"
 * e.g. "www.spotify.com/..." -> "https://www.spotify.com/..."
 * e.g. "artist.bandcamp.com" -> "https://artist.bandcamp.com"
 */
export function normalizeUrl(url: string): string {
  if (!url) return "";
  let trimmed = url.trim();
  if (!trimmed) return "";

  // Strip leading protocols
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

