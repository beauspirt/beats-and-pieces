import { supabase } from "@/lib/supabase";

export const storageService = {
  /**
   * Upload an audio file (MP3, WAV, Opus) to Supabase Storage 'audio' bucket.
   * Returns the public CDN URL of the uploaded audio file.
   */
  async uploadAudio(
    file: File | Blob,
    folder: "submissions" | "beats" | "samples" = "submissions",
    customName?: string
  ): Promise<{ url: string | null; error: string | null }> {
    try {
      const extension = file instanceof File && file.name.includes(".")
        ? file.name.split(".").pop()?.toLowerCase() || "mp3"
        : "mp3";

      const cleanFilename = customName
        ? `${customName}.${extension}`
        : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${extension}`;

      const filePath = `${folder}/${cleanFilename}`;

      const { data, error } = await supabase.storage
        .from("audio")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type || "audio/mpeg",
        });

      if (error) {
        // console.warn("Supabase Audio Upload failed:", error.message);
        return { url: null, error: error.message };
      }

      const { data: publicData } = supabase.storage
        .from("audio")
        .getPublicUrl(data.path);

      return { url: publicData.publicUrl, error: null };
    } catch (err: unknown) {
      // console.error("storageService.uploadAudio error:", err);
      return { url: null, error: err instanceof Error ? err.message : String(err) || "Failed to upload audio" };
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
