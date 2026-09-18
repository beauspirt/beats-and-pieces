import { optimizeAndConvertToOpus, extractAudioMetadata } from "@/lib/audioConverter";
import { optimizeImage } from "@/lib/imageOptimizer";

/**
 * R2 Worker API base URL.
 * Set NEXT_PUBLIC_R2_WORKER_URL in .env.local to your deployed Worker URL.
 * Falls back to same-origin /api (when the Worker is co-located with static assets).
 */
const R2_WORKER_URL =
  process.env.NEXT_PUBLIC_R2_WORKER_URL || "";

function getApiBase(): string {
  return R2_WORKER_URL || "";
}

export interface AudioUploadResponse {
  url: string | null;
  error: string | null;
  duration?: number;
  waveformPeaks?: number[];
  isOpusConverted?: boolean;
}

export const storageService = {
  /**
   * Upload an audio file directly to Cloudflare R2 with automatic client-side Opus compression,
   * or preserve the original file format (for raw sample files).
   */
  async uploadAudio(
    file: File | Blob,
    folder: string = "submissions",
    customName?: string,
    onProgress?: (percent: number) => void,
    options?: { preserveOriginalFormat?: boolean }
  ): Promise<AudioUploadResponse> {
    try {
      const preserveFormat = Boolean(options?.preserveOriginalFormat);

      let processedFile: File | Blob = file;
      let duration = 120;
      let waveformPeaks: number[] = [];
      let isConverted = false;

      if (preserveFormat) {
        // Extract duration & waveform for player UI without re-encoding to Opus
        const meta = await extractAudioMetadata(file);
        duration = meta.duration;
        waveformPeaks = meta.waveformPeaks;
        isConverted = false;
        processedFile = file;
        if (onProgress) onProgress(100);
      } else {
        // Client-side Opus optimization & waveform extraction
        const result = await optimizeAndConvertToOpus(file, onProgress);
        processedFile = result.file;
        duration = result.duration;
        waveformPeaks = result.waveformPeaks;
        isConverted = result.isConverted;
      }

      // Determine clean base name while preserving original filename + timestamp
      let baseName = "";
      if (customName && customName.trim() !== "") {
        baseName = customName.trim();
      } else if (file instanceof File && file.name) {
        const rawName = file.name.replace(/\.[^/.]+$/, "").replace(/[#?%\\/]/g, "").trim();
        baseName = `${rawName}-${Date.now()}`;
      } else if (processedFile instanceof File && processedFile.name) {
        const rawName = processedFile.name.replace(/\.[^/.]+$/, "").replace(/[#?%\\/]/g, "").trim();
        baseName = `${rawName}-${Date.now()}`;
      } else {
        baseName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      }

      if (!baseName) {
        baseName = `audio-${Date.now()}`;
      }

      let extension = "mp3";
      if (preserveFormat) {
        if (file instanceof File && file.name.includes(".")) {
          extension = file.name.split(".").pop()?.toLowerCase() || "wav";
        } else if (processedFile instanceof File && processedFile.name.includes(".")) {
          extension = processedFile.name.split(".").pop()?.toLowerCase() || "wav";
        } else {
          extension = "wav";
        }
      } else {
        extension = isConverted
          ? "opus"
          : (processedFile instanceof File && processedFile.name.includes(".")
              ? processedFile.name.split(".").pop()?.toLowerCase() || "mp3"
              : "mp3");
      }

      const cleanFilename = `${baseName}.${extension}`;

      // Audio files are organized under audio/ (e.g. audio/submissions, audio/beats, audio/samples)
      const r2Folder = folder.startsWith("audio/") ? folder : `audio/${folder}`;
      const r2Result = await this._uploadToR2(processedFile, r2Folder, cleanFilename);
      if (r2Result.url) {
        return {
          url: r2Result.url,
          error: null,
          duration,
          waveformPeaks,
          isOpusConverted: isConverted,
        };
      }

      return {
        url: null,
        error: r2Result.error || "Failed to upload audio to Cloudflare R2",
        duration,
        waveformPeaks,
        isOpusConverted: isConverted,
      };
    } catch (err: unknown) {
      return {
        url: null,
        error: err instanceof Error ? err.message : String(err) || "Failed to upload audio",
      };
    }
  },

  /**
   * Upload an audio sample in its original file format (WAV, MP3, FLAC, AIFF, etc.)
   * without Opus lossy compression to audio/samples/.
   */
  async uploadSample(
    file: File | Blob,
    customName?: string,
    onProgress?: (percent: number) => void
  ): Promise<AudioUploadResponse> {
    return this.uploadAudio(file, "samples", customName, onProgress, { preserveOriginalFormat: true });
  },

  /**
   * Upload an image (avatar, battle cover, release cover) directly to Cloudflare R2.
   * Folders are organized under images/:
   * - "avatars" -> images/avatars
   * - "battles" -> images/covers/battles
   * - "releases" -> images/covers/releases
   */
  async uploadImage(
    file: File | Blob,
    folder: "battles" | "releases" | "avatars" | string = "battles",
    customName?: string
  ): Promise<{ url: string | null; error: string | null }> {
    try {
      // 1. Client-side image compression & resizing
      const isAvatar = folder === "avatars";
      const optimized = await optimizeImage(file, {
        maxWidth: isAvatar ? 512 : 1200,
        maxHeight: isAvatar ? 512 : 1200,
        quality: isAvatar ? 0.85 : 0.88,
        squareCrop: isAvatar,
        mimeType: "image/webp",
      });

      const processedFile = optimized.file;
      const extension = processedFile.name.split(".").pop() || "webp";

      let baseName = "";
      if (customName && customName.trim() !== "") {
        baseName = customName.trim();
      } else if (file instanceof File && file.name) {
        baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[#?%\\/]/g, "").trim();
      } else {
        baseName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      }

      if (!baseName) {
        baseName = `image-${Date.now()}`;
      }

      const cleanFilename = `${baseName}.${extension}`;

      // 2. Folder resolution under images/
      let r2Folder = "images";
      if (isAvatar) {
        r2Folder = "images/avatars";
      } else if (folder === "battles") {
        r2Folder = "images/covers/battles";
      } else if (folder === "releases") {
        r2Folder = "images/covers/releases";
      } else if (folder.startsWith("covers/")) {
        r2Folder = `images/${folder}`;
      } else if (folder.startsWith("images/")) {
        r2Folder = folder;
      } else {
        r2Folder = `images/${folder}`;
      }

      const r2Result = await this._uploadToR2(processedFile, r2Folder, cleanFilename);
      if (r2Result.url) {
        return { url: r2Result.url, error: null };
      }

      // Safe Fallback if offline/local development: optimized lightweight dataUrl
      if (optimized.dataUrl) {
        return { url: optimized.dataUrl, error: null };
      }

      return { url: null, error: r2Result.error || "Failed to upload image to Cloudflare R2" };
    } catch (err: unknown) {
      return { url: null, error: err instanceof Error ? err.message : String(err) || "Failed to upload image" };
    }
  },

  /**
   * Delete a file from Cloudflare R2 / Supabase storage
   */
  async deleteFile(fileUrlOrKey?: string | null): Promise<boolean> {
    if (!fileUrlOrKey || typeof fileUrlOrKey !== "string") return false;
    try {
      // 1. Extract R2 key from URL or relative path
      let key = fileUrlOrKey;
      if (key.includes("/api/media/")) {
        key = decodeURIComponent(key.split("/api/media/")[1]);
      } else if (key.startsWith("http://") || key.startsWith("https://")) {
        try {
          const u = new URL(key);
          if (u.pathname.startsWith("/api/media/")) {
            key = decodeURIComponent(u.pathname.slice("/api/media/".length));
          } else {
            key = u.pathname.replace(/^\//, "");
          }
        } catch {}
      } else if (key.startsWith("/")) {
        key = key.slice(1);
      }

      // If it's a static app asset, don't delete
      if (
        key === "avatars/default-avatar.png" ||
        key === "avatars/default-avatar.svg" ||
        key === "images/avatars/default-avatar.png" ||
        key === "images/avatars/default-avatar.svg"
      ) {
        return false;
      }

      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/media/${encodeURIComponent(key)}`, {
        method: "DELETE",
      });

      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Upload a file to Cloudflare R2 via the Worker API.
   * Returns { url, key, error }.
   */
  async _uploadToR2(
    file: File | Blob,
    folder: string,
    filename: string
  ): Promise<{ url: string | null; key: string | null; error: string | null }> {
    try {
      const apiBase = getApiBase();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);
      formData.append("filename", filename);

      const res = await fetch(`${apiBase}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: res.statusText }));
        return { url: null, key: null, error: (errBody as { error?: string }).error || "R2 upload failed" };
      }

      const data = await res.json() as { url: string; key: string };
      return { url: data.url, key: data.key, error: null };
    } catch {
      // R2 Worker not available — caller should fall back to Supabase
      return { url: null, key: null, error: "R2 Worker unreachable" };
    }
  },
};
