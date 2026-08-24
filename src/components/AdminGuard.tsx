"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-brand border-t-transparent animate-spin border-2" />
      </div>
    );
  }

  if (!isLoggedIn || user?.role !== "admin") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 space-y-5 animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-2xl bg-[#FF5E3A]/10 text-[#FF5E3A] flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2 max-w-md">
          <h2 className="text-2xl font-bold text-white">Admin Access Restricted</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            The Admin Control Center is restricted to authorized platform administrators (<strong>Nerub / adrian.hrihor@gmail.com</strong>).
          </p>
          {user && (
            <p className="text-xs text-zinc-500 font-mono">
              Currently logged in as: {user.nickname} ({user.email}) [{user.role}]
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Link
            href="/battles"
            className="px-5 py-2.5 rounded-xl bg-[#202020] hover:bg-[#282828] text-xs font-bold text-zinc-300 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Battles</span>
          </Link>
          <Link
            href="/signin"
            className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand/90 text-xs font-bold text-white transition-all shadow-md active:scale-95"
          >
            Sign in as Admin
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
