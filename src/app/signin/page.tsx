"use client";

import React, { useState, Suspense, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Loader2, AlertCircle } from "lucide-react";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const { isLoggedIn, isLoading, signInWithGoogle, signInWithGoogleIdToken } = useAuth();

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [gisReady, setGisReady] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "941946357872-ks533hie1tdfrt11dqr16i4g14jqisd9.apps.googleusercontent.com";

  useEffect(() => {
    if (redirectParam) {
      try {
        localStorage.setItem("bnp_redirect_url", redirectParam);
      } catch {}
    }
  }, [redirectParam]);

  useEffect(() => {
    if (!isLoading && isLoggedIn) {
      const target = localStorage.getItem("bnp_redirect_url") || redirectParam || "/battles";
      try {
        localStorage.removeItem("bnp_redirect_url");
      } catch {}
      router.replace(target);
    }
  }, [isLoggedIn, isLoading, redirectParam, router]);

  const handleCredentialResponse = useCallback(
    async (response: { credential?: string }) => {
      if (!response.credential) return;
      setIsAuthenticating(true);
      setAuthError(null);

      try {
        if (redirectParam) {
          try {
            localStorage.setItem("bnp_redirect_url", redirectParam);
          } catch {}
        }
        const { isClaimed } = await signInWithGoogleIdToken(response.credential);
        const target = isClaimed
          ? (localStorage.getItem("bnp_redirect_url") || redirectParam || "/battles")
          : "/profile?onboarding=true";
        try {
          localStorage.removeItem("bnp_redirect_url");
        } catch {}
        router.replace(target);
      } catch (err: unknown) {
        setIsAuthenticating(false);
        setAuthError(
          err instanceof Error
            ? err.message
            : "Google Sign-In failed. Please try again."
        );
      }
    },
    [redirectParam, router, signInWithGoogleIdToken]
  );

  const initGoogleGIS = useCallback(() => {
    if (typeof window === "undefined") return;
    const google = (window as unknown as { google?: any })?.google;
    if (!google?.accounts?.id || !googleClientId) return;

    try {
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      if (googleBtnRef.current) {
        googleBtnRef.current.innerHTML = "";
        google.accounts.id.renderButton(googleBtnRef.current, {
          type: "standard",
          theme: "filled_black",
          size: "large",
          text: "signin_with",
          shape: "pill",
          width: 320,
          logo_alignment: "left",
        });
        setGisReady(true);
      }

      // Display Google One Tap prompt if eligible
      google.accounts.id.prompt();
    } catch (e) {
      console.warn("Google Identity Services initialization:", e);
    }
  }, [googleClientId, handleCredentialResponse]);

  // If GIS script already loaded before component mounted
  useEffect(() => {
    if (typeof window !== "undefined" && (window as unknown as { google?: any })?.google?.accounts?.id) {
      initGoogleGIS();
    }
  }, [initGoogleGIS]);

  if (isLoading || isLoggedIn) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  const handleGoogleFallbackClick = async () => {
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
      setIsAuthenticating(false);
      setAuthError(
        err instanceof Error
          ? err.message
          : "Google Sign-In failed. Please check that Google OAuth is configured in your Supabase dashboard."
      );
    }
  };

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initGoogleGIS}
      />
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
          <div className="w-full max-w-sm mb-6 p-4 rounded-3xl bg-red-500/10 text-red-400 text-xs text-left flex items-start gap-3 animate-in shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{authError}</p>
          </div>
        )}

        {/* Google Sign-In Container */}
        <div className="w-full max-w-xs mb-10 flex flex-col items-center justify-center min-h-[50px]">
          {isAuthenticating ? (
            <div className="w-full py-3.5 px-6 rounded-3xl bg-white text-black text-xs font-bold flex items-center justify-center gap-2.5 shadow-lg">
              <Loader2 className="w-4 h-4 animate-spin text-black" />
              <span>Authenticating with Google...</span>
            </div>
          ) : (
            <>
              {/* Google Native GIS Button */}
              <div
                ref={googleBtnRef}
                className={`flex justify-center w-full ${!gisReady ? "hidden" : ""}`}
              />

              {/* Fallback button if GIS script hasn't mounted yet or is blocked */}
              {!gisReady && (
                <button
                  onClick={handleGoogleFallbackClick}
                  disabled={isAuthenticating}
                  className="w-full py-3.5 px-6 rounded-3xl bg-white hover:bg-zinc-100 text-black text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                >
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
                  <span>Sign in with Google</span>
                </button>
              )}
            </>
          )}
        </div>

      </div>
    </>
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
