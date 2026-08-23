"use client";

import React, { useState, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Loader2, AlertCircle } from "lucide-react";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const { isLoggedIn, isLoading, signInWithGoogle } = useAuth();

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  React.useEffect(() => {
    if (redirectParam) {
      try {
        localStorage.setItem("bnp_redirect_url", redirectParam);
      } catch {}
    }
  }, [redirectParam]);

  React.useEffect(() => {
    if (!isLoading && isLoggedIn) {
      const target = localStorage.getItem("bnp_redirect_url") || redirectParam || "/battles";
      try {
        localStorage.removeItem("bnp_redirect_url");
      } catch {}
      router.replace(target);
    }
  }, [isLoggedIn, isLoading, redirectParam, router]);

  if (isLoading || isLoggedIn) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  const handleGoogleClick = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      if (redirectParam) {
        try {
          localStorage.setItem("bnp_redirect_url", redirectParam);
        } catch {}
      }
      await signInWithGoogle();
    } catch (err: unknown) {
      // console.error("Google OAuth error:", err);
      setIsAuthenticating(false);
      setAuthError(
        err instanceof Error
          ? err.message
          : "Google Sign-In failed. Please check that Google OAuth is configured in your Supabase dashboard."
      );
    }
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
        Sign in with your verified Google account to enter beat battles, rate submissions, and manage your showcase profile.
      </p>

      {/* Auth Error Banner */}
      {authError && (
        <div className="w-full max-w-sm mb-6 p-4 rounded-xl bg-red-500/10 text-red-400 text-xs text-left flex items-start gap-3 animate-in shake">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{authError}</p>
        </div>
      )}

      {/* Single Google Sign-In Button */}
      <div className="w-full max-w-xs mb-10">
        <button
          onClick={handleGoogleClick}
          disabled={isAuthenticating}
          className="w-full py-3.5 px-6 rounded-xl bg-white hover:bg-zinc-100 text-black text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
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
      </div>

    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[75vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-brand animate-spin" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
