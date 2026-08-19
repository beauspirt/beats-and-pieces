"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { sampleProducers } from "@/lib/mock-data";
import { ArrowRight, UserCheck, Loader2, AlertCircle } from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const { signInWithGoogle, signInWithDiscord, loginWithUser } = useAuth();

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleGoogleClick = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      console.error("Google OAuth error:", err);
      setIsAuthenticating(false);
      setAuthError(
        err instanceof Error
          ? err.message
          : "Google Sign-In failed. Please check that Google OAuth is configured in your Supabase dashboard."
      );
    }
  };

  const handleDiscordClick = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      await signInWithDiscord();
    } catch (err: unknown) {
      console.error("Discord OAuth error:", err);
      setIsAuthenticating(false);
      setAuthError(
        err instanceof Error
          ? err.message
          : "Discord Sign-In failed. Please check that Discord OAuth is configured in your Supabase dashboard."
      );
    }
  };

  const handleQuickLogin = (producerId: string) => {
    loginWithUser(producerId);
    router.push("/profile");
  };

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center text-center px-4 animate-in fade-in duration-300">
      
      {/* Real Logo from project */}
      <div className="w-full max-w-2xl mb-6 flex items-center justify-center select-none">
        <div className="relative h-20 sm:h-24 w-64 sm:w-80">
          <Image
            src="/logo.png"
            alt="Beats & Pieces"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

      <p className="text-sm text-[#8E8E93] max-w-md mb-8 leading-relaxed">
        Sign in with your verified account to enter beat battles, rate submissions, and manage your artist profile.
      </p>

      {/* Auth Error Banner */}
      {authError && (
        <div className="w-full max-w-md mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-left flex items-start gap-3 animate-in shake">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{authError}</p>
        </div>
      )}

      {/* Auth Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full max-w-md mb-10">
        {/* Google OAuth Button */}
        <button
          onClick={handleGoogleClick}
          disabled={isAuthenticating}
          className="w-full py-3.5 px-5 rounded-xl bg-white hover:bg-zinc-100 text-black text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
        >
          {isAuthenticating ? (
            <Loader2 className="w-4 h-4 animate-spin text-black" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>Sign in with Google</span>
        </button>

        {/* Discord OAuth Button */}
        <button
          onClick={handleDiscordClick}
          disabled={isAuthenticating}
          className="w-full py-3.5 px-5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
        >
          {isAuthenticating ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          )}
          <span>Sign in with Discord</span>
        </button>
      </div>

      {/* QUICK LOGIN AS LEGACY BEATMAKER (TESTING & DEMO HELPER) */}
      <div className="w-full max-w-2xl bg-[#181818] border border-white/5 rounded-2xl p-5 sm:p-6 text-left space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#7B61FF]" />
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
              Quick Switcher (Testing & Demo Showcase)
            </h3>
          </div>
          <span className="text-[10px] text-[#666666] font-mono">
            {Object.keys(sampleProducers).length} Accounts
          </span>
        </div>

        <p className="text-xs text-[#999999] leading-relaxed">
          Click any registered beatmaker profile below to preview their individual showcase and battle permissions:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1 max-h-48 overflow-y-auto pr-1">
          {Object.entries(sampleProducers).map(([id, prod]) => (
            <button
              key={id}
              onClick={() => handleQuickLogin(id)}
              className="p-2.5 rounded-xl bg-[#121212] hover:bg-[#202020] border border-white/5 hover:border-[#7B61FF]/40 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-[#7B61FF] transition-colors truncate">
                  {prod.nickname}
                </span>
                <ArrowRight className="w-3 h-3 text-[#555555] group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
              <span className="text-[10px] font-mono text-[#666666] truncate block mt-0.5">
                {prod.email}
              </span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
