"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BattleDetailClient } from "@/components/BattleDetailClient";
import { ProducerProfileClient } from "@/components/ProducerProfileClient";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  const [pathname, setPathname] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPathname(window.location.pathname);
      setMounted(true);
    }
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  // Handle dynamic /battles/[id] routes created at runtime
  if (pathname.startsWith("/battles/")) {
    const battleId = pathname.replace(/^\/battles\//, "").split("/")[0].split("?")[0];
    if (battleId) {
      return <BattleDetailClient battleId={battleId} />;
    }
  }

  // Handle dynamic /producers/[id] routes created at runtime
  if (pathname.startsWith("/producers/")) {
    const producerId = pathname.replace(/^\/producers\//, "").split("/")[0].split("?")[0];
    if (producerId) {
      return <ProducerProfileClient producerId={producerId} />;
    }
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-6xl font-black text-[#FF5E3A] mb-4">404</h1>
      <h2 className="text-2xl font-bold text-white mb-2">Page Not Found</h2>
      <p className="text-[#888888] max-w-md mb-8">
        The page you are looking for doesn't exist or may have been moved.
      </p>
      <Link
        href="/battles"
        className="px-6 py-3 rounded-full bg-[#FF5E3A] hover:bg-[#FF4520] text-white font-bold transition-colors inline-flex items-center gap-2 shadow-lg"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Battles</span>
      </Link>
    </div>
  );
}
