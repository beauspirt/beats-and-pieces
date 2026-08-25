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

  // Pointer drag handlers
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
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
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
    setZoom(Math.max(1, Math.min(3, newZoom)));
  };

  // Perform canvas crop
  const handleApplyCrop = useCallback(() => {
    if (!imageRef.current || !containerRef.current || isProcessing) return;
    setIsProcessing(true);

    const img = imageRef.current;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const cropSize = containerRect.width; // 280px or 320px square

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

    // Calculate base dimensions of image inside container (object-contain equivalent)
    const imgRatio = imageSize.width / imageSize.height;
    let baseW = cropSize;
    let baseH = cropSize;

    if (imgRatio > 1) {
      // Landscape: height matches container, width expands
      baseH = cropSize;
      baseW = cropSize * imgRatio;
    } else {
      // Portrait or square: width matches container, height expands
      baseW = cropSize;
      baseH = cropSize / imgRatio;
    }

    const currentW = baseW * zoom;
    const currentH = baseH * zoom;

    // Center point in container
    const centerX = cropSize / 2 + offset.x;
    const centerY = cropSize / 2 + offset.y;

    // Image top-left in container coordinates
    const imgLeft = centerX - currentW / 2;
    const imgTop = centerY - currentH / 2;

    // Map container crop viewport [0, 0, cropSize, cropSize] to image source coordinates
    const scaleToSource = imageSize.width / currentW;
    const srcX = Math.max(0, (0 - imgLeft) * scaleToSource);
    const srcY = Math.max(0, (0 - imgTop) * scaleToSource);
    const srcW = Math.min(imageSize.width, cropSize * scaleToSource);
    const srcH = Math.min(imageSize.height, cropSize * scaleToSource);

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
              {/* Scaled & Positioned Image */}
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop preview"
                draggable={false}
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  transition: isDragging ? "none" : "transform 0.1s ease-out",
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
                className="pointer-events-none select-none"
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
