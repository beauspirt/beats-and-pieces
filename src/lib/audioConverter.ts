"use client";

import {
  Output,
  BufferTarget,
  OggOutputFormat,
  AudioBufferSource,
} from "mediabunny";
import { extractRealAudioBufferWaveform, WaveformData } from "@/components/AudioWaveformPlayer";

export interface AudioConversionResult {
  file: File | Blob;
  duration: number;
  waveformPeaks: number[];
  isConverted: boolean;
  originalSize: number;
  convertedSize: number;
}

/**
 * High-performance client-side audio compressor & Opus transcoder.
 * Transcodes WAV, FLAC, AIFF, and large audio files into pristine 192kbps Opus streams.
 */
export async function optimizeAndConvertToOpus(
  inputFile: File | Blob,
  onProgress?: (progressPercent: number) => void
): Promise<AudioConversionResult> {
  const originalSize = inputFile.size;
  const fileName = inputFile instanceof File ? inputFile.name : "audio.wav";
  const cleanBaseName = fileName.replace(/\.[^/.]+$/, "");

  // 1. Instantly decode audio buffer via Web Audio API for duration & waveform extraction
  let realDuration = 120;
  let extractedWaveform: WaveformData | null = null;
  let decodedAudioBuffer: AudioBuffer | null = null;

  try {
    const arrayBuf = await inputFile.arrayBuffer();
    const AudioCtx =
      typeof window !== "undefined"
        ? window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        : null;

    if (AudioCtx) {
      const ctx = new AudioCtx();
      decodedAudioBuffer = await ctx.decodeAudioData(arrayBuf.slice(0));
      realDuration = Math.round(decodedAudioBuffer.duration);
      extractedWaveform = extractRealAudioBufferWaveform(decodedAudioBuffer, 800);
      ctx.close();
    }
  } catch (decodeErr) {
    // console.warn("Waveform extraction warning:", decodeErr);
  }

  const waveformPeaks = extractedWaveform ? extractedWaveform.peaks : [];

  if (!decodedAudioBuffer) {
    return {
      file: inputFile,
      duration: realDuration,
      waveformPeaks,
      isConverted: false,
      originalSize,
      convertedSize: originalSize,
    };
  }

  // 2. Transcode AudioBuffer to Ogg Opus (192kbps high-fidelity stereo VBR) via Mediabunny WebCodecs
  try {
    if (onProgress) onProgress(20);

    const target = new BufferTarget();
    const output = new Output({
      format: new OggOutputFormat(),
      target,
    });

    const audioSource = new AudioBufferSource({
      codec: "opus",
      bitrate: 192000,
    });

    output.addAudioTrack(audioSource);

    await output.start();
    if (onProgress) onProgress(40);

    await audioSource.add(decodedAudioBuffer);
    if (onProgress) onProgress(80);

    audioSource.close();
    await output.finalize();

    if (onProgress) onProgress(100);

    const outputBuffer = target.buffer;

    if (outputBuffer && outputBuffer.byteLength > 0) {
      const opusBlob = new Blob([outputBuffer], { type: "audio/ogg; codecs=opus" });
      const opusFile = new File([opusBlob], `${cleanBaseName}.opus`, {
        type: "audio/ogg; codecs=opus",
        lastModified: Date.now(),
      });

      return {
        file: opusFile,
        duration: realDuration,
        waveformPeaks,
        isConverted: true,
        originalSize,
        convertedSize: opusFile.size,
      };
    }
  } catch (convErr) {
    // console.warn("Opus conversion fallback to original file:", convErr);
  }

  // Fallback to original file if conversion is unsupported on legacy browser
  return {
    file: inputFile,
    duration: realDuration,
    waveformPeaks,
    isConverted: false,
    originalSize,
    convertedSize: originalSize,
  };
}

/**
 * Extract audio duration and waveform peaks without re-encoding to Opus.
 * Ideal for raw sample files where the original format (WAV, MP3, FLAC, AIFF, etc.) must be preserved.
 */
export async function extractAudioMetadata(
  inputFile: File | Blob
): Promise<{ duration: number; waveformPeaks: number[] }> {
  let realDuration = 120;
  let waveformPeaks: number[] = [];

  try {
    const arrayBuf = await inputFile.arrayBuffer();
    const AudioCtx =
      typeof window !== "undefined"
        ? window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        : null;

    if (AudioCtx) {
      const ctx = new AudioCtx();
      const decodedAudioBuffer = await ctx.decodeAudioData(arrayBuf.slice(0));
      realDuration = Math.round(decodedAudioBuffer.duration);
      const extractedWaveform = extractRealAudioBufferWaveform(decodedAudioBuffer, 800);
      waveformPeaks = extractedWaveform ? extractedWaveform.peaks : [];
      ctx.close();
    }
  } catch (decodeErr) {
    // decode fallback
  }

  return { duration: realDuration, waveformPeaks };
}
