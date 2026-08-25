import { supabase } from "@/lib/supabase";
import { optimizeAndConvertToOpus } from "@/lib/audioConverter";
import { optimizeImage } from "@/lib/imageOptimizer";

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
   * Upload an artwork image to Supabase Storage with automatic client-side compression.
   * Compresses large camera/phone photos to WebP/JPEG to guarantee fast uploads
   * and safe fallback persistence without exceeding LocalStorage quotas.
   */
  async uploadImage(
    file: File | Blob,
    folder: "battles" | "releases" | "avatars" = "battles",
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
      const cleanFilename = customName
        ? `${customName}.${extension}`
        : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${extension}`;

      const filePath = `${folder}/${cleanFilename}`;
      const contentType = processedFile.type || "image/webp";

      // 2. Try primary bucket "covers"
      const { data, error } = await supabase.storage
        .from("covers")
        .upload(filePath, processedFile, {
          cacheControl: "3600",
          upsert: true,
          contentType,
        });

      if (!error && data) {
        const { data: publicData } = supabase.storage
          .from("covers")
          .getPublicUrl(data.path);
        return { url: publicData.publicUrl, error: null };
      }

      // 3. Fallback: Try "avatars" bucket if folder is avatars
      if (isAvatar) {
        const { data: avatarData, error: avatarError } = await supabase.storage
          .from("avatars")
          .upload(cleanFilename, processedFile, {
            cacheControl: "3600",
            upsert: true,
            contentType,
          });

        if (!avatarError && avatarData) {
          const { data: publicData } = supabase.storage
            .from("avatars")
            .getPublicUrl(avatarData.path);
          return { url: publicData.publicUrl, error: null };
        }
      }

      // 4. Safe Fallback: If Supabase Storage is not accessible, return optimized lightweight dataUrl (~30KB)
      if (optimized.dataUrl) {
        return { url: optimized.dataUrl, error: null };
      }

      return { url: null, error: error?.message || "Failed to upload image" };
    } catch (err: unknown) {
      return { url: null, error: err instanceof Error ? err.message : String(err) || "Failed to upload image" };
    }
  },
};
