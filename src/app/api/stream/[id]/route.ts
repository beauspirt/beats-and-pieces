import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Mapping of anonymous session hash tokens to real sample WAV audio
const trackStreamMap: Record<string, string> = {
  "blind-01": "01 Ortega - Bonita Applebong.wav",
  "blind-02": "02 C.S.T - ThunderClouds.wav",
  "blind-03": "03 flg - bule temporale.wav",
  "blind-04": "04 Egris - Triburi.wav",
  "blind-05": "05 Nerub - Butterflies in my lungs.wav",
  "blind-06": "06 DFB - Apollo's Lyre.wav",
  "blind-07": "07 Ripp - Beyond.wav",
  "blind-08": "08 Mr Tweaks - Dmzl 4.wav",
  "blind-09": "09 Fane Stelaru - Late to the party.wav",
  "blind-10": "10 Fu - Malibu.wav",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const fileName = trackStreamMap[id] || "01 Ortega - Bonita Applebong.wav";
  const filePath = path.join(process.cwd(), "public", "audio", fileName);

  if (!fs.existsSync(filePath)) {
    return new NextResponse("Audio stream not found", { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const fileStream = fs.createReadStream(filePath);

  // Return binary stream with anonymized headers (anti-cheating metadata shield)
  return new NextResponse(fileStream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "audio/wav",
      "Content-Length": stat.size.toString(),
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
      "X-Content-Type-Options": "nosniff",
      "X-Stream-Id": "anonymized-battle-stream",
    },
  });
}
