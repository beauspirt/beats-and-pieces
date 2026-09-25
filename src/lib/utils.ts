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

/**
 * Formats an ISO string or Date into a string suitable for <input type="datetime-local">
 * using the user's local timezone (YYYY-MM-DDTHH:mm).
 */
export function toDatetimeLocalString(isoOrDate?: string | Date | null): string {
  if (!isoOrDate) return "";
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Parses a datetime-local input string (YYYY-MM-DDTHH:mm in local time) into an ISO 8601 string (UTC).
 */
export function fromDatetimeLocalString(localStr?: string | null): string {
  if (!localStr) return "";
  const d = new Date(localStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString();
}

/**
 * Generates a clean, simple, human-readable slug for a beat based on its title.
 * Handles diacritics, spaces, punctuation.
 * Falls back to fallbackId or 'beat'.
 */
export function toBeatSlug(title?: string, fallbackId?: string): string {
  if (!title || typeof title !== "string") {
    if (!fallbackId) return "beat";
    return fallbackId.replace(/^sub-/, "").toLowerCase();
  }

  const normalized = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || (fallbackId ? fallbackId.replace(/^sub-/, "").toLowerCase() : "beat");
}

