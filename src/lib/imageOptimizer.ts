/**
 * Client-side image compression and resizing utility.
 * Optimizes large user camera uploads down to compact WebP/JPEG formats
 * to ensure blazing-fast uploads and prevent LocalStorage quota overflow.
 */

export interface OptimizeImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  squareCrop?: boolean;
  mimeType?: "image/webp" | "image/jpeg" | "image/png";
}

export interface OptimizedImageResult {
  file: File;
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export async function optimizeImage(
  fileOrBlob: File | Blob,
  options: OptimizeImageOptions = {}
): Promise<OptimizedImageResult> {
  const {
    maxWidth = 512,
    maxHeight = 512,
    quality = 0.85,
    squareCrop = false,
    mimeType = "image/webp",
  } = options;

  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      const fallbackFile =
        fileOrBlob instanceof File
          ? fileOrBlob
          : new File([fileOrBlob], "image.png", { type: fileOrBlob.type });
      return resolve({
        file: fallbackFile,
        blob: fileOrBlob,
        dataUrl: "",
        width: 0,
        height: 0,
        sizeBytes: fileOrBlob.size,
      });
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.onload = () => {
        let srcX = 0;
        let srcY = 0;
        let srcW = img.naturalWidth || img.width;
        let srcH = img.naturalHeight || img.height;

        if (squareCrop) {
          const minDim = Math.min(srcW, srcH);
          srcX = (srcW - minDim) / 2;
          srcY = (srcH - minDim) / 2;
          srcW = minDim;
          srcH = minDim;
        }

        let targetW = srcW;
        let targetH = srcH;

        if (targetW > maxWidth || targetH > maxHeight) {
          const ratio = Math.min(maxWidth / targetW, maxHeight / targetH);
          targetW = Math.round(targetW * ratio);
          targetH = Math.round(targetH * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return reject(new Error("Failed to create canvas context"));
        }

        // High quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, targetW, targetH);

        // Try webp first, fallback to jpeg if unsupported
        let finalMime = mimeType;
        let dataUrl = "";
        try {
          dataUrl = canvas.toDataURL(finalMime, quality);
          if (!dataUrl.startsWith(`data:${finalMime}`)) {
            finalMime = "image/jpeg";
            dataUrl = canvas.toDataURL(finalMime, quality);
          }
        } catch {
          finalMime = "image/jpeg";
          dataUrl = canvas.toDataURL(finalMime, quality);
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              const fallbackFile =
                fileOrBlob instanceof File
                  ? fileOrBlob
                  : new File([fileOrBlob], "image.png", { type: fileOrBlob.type });
              return resolve({
                file: fallbackFile,
                blob: fileOrBlob,
                dataUrl,
                width: targetW,
                height: targetH,
                sizeBytes: fileOrBlob.size,
              });
            }

            const originalName = fileOrBlob instanceof File ? fileOrBlob.name : "avatar";
            const baseName = originalName.substring(0, originalName.lastIndexOf(".")) || originalName;
            const extension = finalMime === "image/webp" ? "webp" : "jpg";
            const optimizedFile = new File([blob], `${baseName}.${extension}`, { type: finalMime });

            resolve({
              file: optimizedFile,
              blob,
              dataUrl,
              width: targetW,
              height: targetH,
              sizeBytes: blob.size,
            });
          },
          finalMime,
          quality
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(fileOrBlob);
  });
}
