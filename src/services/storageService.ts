import { supabase } from "@/lib/supabase";
import { optimizeAndConvertToOpus } from "@/lib/audioConverter";

export interface AudioUploadResponse {
  url: string | null;
  error: string | null;
  duration?: number;
  waveformPeaks?: number[];
  isOpusConverted?: boolean;
}

export const storageService = {
  /**
   * Upload an audio file with automatic client-side Opus compression.
   * Transcodes uncompressed/large WAV/FLAC files to studio-grade Opus (192kbps)
   * before uploading to the Supabase Storage 'audio' bucket.
   */
  async uploadAudio(
    file: File | Blob,
    folder: "submissions" | "beats" | "samples" = "submissions",
    customName?: string,
    onProgress?: (percent: number) => void
  ): Promise<AudioUploadResponse> {
    try {
      // Automatic Opus optimization & waveform extraction
      const {
        file: processedFile,
        duration,
        waveformPeaks,
        isConverted,
      } = await optimizeAndConvertToOpus(file, onProgress);

      const extension = isConverted
        ? "opus"
        : (processedFile instanceof File && processedFile.name.includes(".")
            ? processedFile.name.split(".").pop()?.toLowerCase() || "mp3"
            : "mp3");

      const cleanFilename = customName
        ? `${customName}.${extension}`
        : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${extension}`;

      const filePath = `${folder}/${cleanFilename}`;

      const contentType = isConverted
        ? "audio/ogg; codecs=opus"
        : (processedFile.type || "audio/mpeg");

      const { data, error } = await supabase.storage
        .from("audio")
        .upload(filePath, processedFile, {
          cacheControl: "3600",
          upsert: true,
          contentType,
        });

      if (error) {
        return {
          url: null,
          error: error.message,
          duration,
          waveformPeaks,
          isOpusConverted: isConverted,
        };
      }

      const { data: publicData } = supabase.storage
        .from("audio")
        .getPublicUrl(data.path);

      return {
        url: publicData.publicUrl,
        error: null,
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
   * Upload an artwork image to Supabase Storage 'covers' bucket.
   * Returns the public CDN URL of the uploaded cover image.
   */
  async uploadImage(
    file: File | Blob,
    folder: "battles" | "releases" | "avatars" = "battles",
    customName?: string
  ): Promise<{ url: string | null; error: string | null }> {
    try {
      const extension = file instanceof File && file.name.includes(".")
        ? file.name.split(".").pop()?.toLowerCase() || "png"
        : "png";

      const cleanFilename = customName
        ? `${customName}.${extension}`
        : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${extension}`;

      const filePath = `${folder}/${cleanFilename}`;

      const { data, error } = await supabase.storage
        .from("covers")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type || "image/png",
        });

      if (error) {
        // console.warn("Supabase Image Upload failed:", error.message);
        return { url: null, error: error.message };
      }

      const { data: publicData } = supabase.storage
        .from("covers")
        .getPublicUrl(data.path);

      return { url: publicData.publicUrl, error: null };
    } catch (err: unknown) {
      // console.error("storageService.uploadImage error:", err);
      return { url: null, error: err instanceof Error ? err.message : String(err) || "Failed to upload image" };
    }
  },
};
