"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ClientPortal } from "./ClientPortal";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { ZoomIn, ZoomOut, RotateCcw, Check, X } from "lucide-react";

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob, croppedDataUrl: string) => void;
}

const CROP_SIZE = 240; // Crop circle diameter in px

function getBaseDimensions(w: number, h: number) {
  if (!w || !h) return { baseW: CROP_SIZE, baseH: CROP_SIZE };
  const ratio = w / h;
  if (ratio >= 1) {
    // Landscape / square: height matches crop circle, width scales up
    return { baseW: CROP_SIZE * ratio, baseH: CROP_SIZE };
  } else {
    // Portrait: width matches crop circle, height scales up
    return { baseW: CROP_SIZE, baseH: CROP_SIZE / ratio };
  }
}

function clampOffset(x: number, y: number, currentZoom: number, w: number, h: number) {
  const { baseW, baseH } = getBaseDimensions(w, h);
  const curW = baseW * currentZoom;
  const curH = baseH * currentZoom;

  const maxX = Math.max(0, (curW - CROP_SIZE) / 2);
  const maxY = Math.max(0, (curH - CROP_SIZE) / 2);

  return {
    x: Math.max(-maxX, Math.min(maxX, x)),
    y: Math.max(-maxY, Math.min(maxY, y)),
  };
}

export function ImageCropperModal({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
}: ImageCropperModalProps) {
  useBodyScrollLock(isOpen);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Reset state when modal opens with a new image
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setIsDragging(false);

      const img = new Image();
      img.onload = () => {
        setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = imageSrc;
    }
  }, [isOpen, imageSrc]);

  // Pointer drag handlers with strict boundary clamping
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const rawX = e.clientX - dragStart.x;
    const rawY = e.clientY - dragStart.y;
    const clamped = clampOffset(rawX, rawY, zoom, imageSize.width, imageSize.height);
    setOffset(clamped);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.max(1, Math.min(3, newZoom));
    setZoom(clampedZoom);
    setOffset((prev) => clampOffset(prev.x, prev.y, clampedZoom, imageSize.width, imageSize.height));
  };

  // Perform canvas crop bounded strictly within image limits
  const handleApplyCrop = useCallback(() => {
    if (!imageRef.current || !containerRef.current || isProcessing || !imageSize.width) return;
    setIsProcessing(true);

    const img = imageRef.current;
    const outputCanvas = document.createElement("canvas");
    const outputDim = 512; // High-resolution avatar output
    outputCanvas.width = outputDim;
    outputCanvas.height = outputDim;

    const ctx = outputCanvas.getContext("2d");
    if (!ctx) {
      setIsProcessing(false);
      return;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const { baseW, baseH } = getBaseDimensions(imageSize.width, imageSize.height);
    const curW = baseW * zoom;
    const curH = baseH * zoom;
    const clamped = clampOffset(offset.x, offset.y, zoom, imageSize.width, imageSize.height);

    // Delta from image top-left to crop box top-left
    const deltaX = (curW - CROP_SIZE) / 2 - clamped.x;
    const deltaY = (curH - CROP_SIZE) / 2 - clamped.y;

    const scale = imageSize.width / curW;
    const srcX = Math.max(0, Math.min(imageSize.width - CROP_SIZE * scale, deltaX * scale));
    const srcY = Math.max(0, Math.min(imageSize.height - CROP_SIZE * scale, deltaY * scale));
    const srcW = Math.min(imageSize.width - srcX, CROP_SIZE * scale);
    const srcH = Math.min(imageSize.height - srcY, CROP_SIZE * scale);

    // Draw directly into 512x512 canvas
    ctx.drawImage(
      img,
      srcX,
      srcY,
      srcW,
      srcH,
      0,
      0,
      outputDim,
      outputDim
    );

    // Export as WebP / JPEG Blob
    outputCanvas.toBlob(
      (blob) => {
        setIsProcessing(false);
        if (blob) {
          const dataUrl = outputCanvas.toDataURL("image/webp", 0.88);
          onCropComplete(blob, dataUrl);
          onClose();
        }
      },
      "image/webp",
      0.88
    );
  }, [imageSize, zoom, offset, onCropComplete, onClose, isProcessing]);

  if (!isOpen || !imageSrc) return null;

  const { baseW, baseH } = getBaseDimensions(imageSize.width, imageSize.height);

  return (
    <ClientPortal>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-[#181818] rounded-[28px] max-w-md w-full overflow-hidden shadow-2xl space-y-6 p-6 sm:p-8 relative cursor-default border border-white/5"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Edit Profile Picture
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#121212] text-zinc-400 hover:text-white flex items-center justify-center text-sm cursor-pointer shrink-0 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Interactive Crop Viewport */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <div
              ref={containerRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="w-[280px] h-[280px] sm:w-[300px] sm:h-[300px] rounded-2xl relative overflow-hidden bg-black select-none touch-none cursor-grab active:cursor-grabbing shadow-inner flex items-center justify-center"
            >
              {/* Scaled & Positioned Image (Never smaller than the crop circle) */}
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop preview"
                draggable={false}
                style={{
                  width: `${baseW * zoom}px`,
                  height: `${baseH * zoom}px`,
                  transform: `translate(${offset.x}px, ${offset.y}px)`,
                  transition: isDragging ? "none" : "transform 0.1s ease-out",
                }}
                className="pointer-events-none select-none max-w-none max-h-none absolute"
              />

              {/* Circular Mask Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Darkened backdrop with circular cut-out */}
                <div
                  className="w-full h-full"
                  style={{
                    background:
                      "radial-gradient(circle 120px at center, transparent 120px, rgba(0, 0, 0, 0.65) 121px)",
                  }}
                />
                {/* Circular Boundary Ring */}
                <div className="absolute w-[240px] h-[240px] rounded-full border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] pointer-events-none" />
              </div>
            </div>

            <p className="text-xs text-[#888888] pt-1 text-center">
              Drag to reposition • Use slider to zoom
            </p>
          </div>

          {/* Zoom Controls */}
          <div className="space-y-3 bg-[#121212] p-3.5 rounded-xl">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleZoomChange(zoom - 0.2)}
                className="w-8 h-8 rounded-lg bg-[#1E1E1E] hover:bg-[#282828] text-zinc-300 hover:text-white flex items-center justify-center text-xs font-bold shrink-0 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                className="flex-1 accent-brand h-1.5 bg-[#2A2A2A] rounded-lg appearance-none cursor-pointer"
              />

              <button
                type="button"
                onClick={() => handleZoomChange(zoom + 0.2)}
                className="w-8 h-8 rounded-lg bg-[#1E1E1E] hover:bg-[#282828] text-zinc-300 hover:text-white flex items-center justify-center text-xs font-bold shrink-0 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="w-8 h-8 rounded-lg bg-[#1E1E1E] hover:bg-[#282828] text-zinc-300 hover:text-white flex items-center justify-center text-xs font-bold shrink-0 transition-colors ml-1"
                title="Reset View"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2.5 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-zinc-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyCrop}
              disabled={isProcessing}
              className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isProcessing ? "Cropping..." : "Save Picture"}</span>
            </button>
          </div>
        </div>
      </div>
    </ClientPortal>
  );
}
