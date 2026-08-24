"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ShieldAlert, ArrowLeft, LogIn, Disc } from "lucide-react";
import { battleService } from "@/services";

export const HostGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoggedIn, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine if a session is still hydrating from localStorage/Supabase
  const isHydrating = typeof window !== "undefined" && !user && Boolean(
    localStorage.getItem("bnp_active_user_id") && localStorage.getItem("bnp_active_user_id") !== "logged_out"
  );

  if (!mounted || isLoading || isHydrating) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-brand border-t-transparent animate-spin border-2" />
      </div>
    );
  }

  // Check if user is admin, host role, or an assigned host on any battle
  const isHost = Boolean(
    user && (
      user.role === "admin" ||
      user.role === "host" ||
      (user.email && battleService.getBattlesByHost(user.email).length > 0) ||
      (user.nickname && battleService.getBattlesByHost(user.nickname).length > 0)
    )
  );

  if (!isLoggedIn || !user || !isHost) {
    return (
      <div className="min-h-[65vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-[#181818] rounded-3xl p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-[#FF8A65]/10 text-[#FF8A65] mx-auto flex items-center justify-center">
            <Disc className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Host Panel Access Restricted
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed">
              This portal is restricted to assigned battle hosts. Log in with your verified host email address to manage your battles.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              href="/signin"
              className="w-full py-3 rounded-xl bg-brand hover:bg-brand/90 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In as Host</span>
            </Link>

            <Link
              href="/"
              className="w-full py-2.5 rounded-xl bg-[#202020] hover:bg-[#282828] text-zinc-400 hover:text-white text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
