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
  const { isLoggedIn, isLoading, signInWithGoogle, loginWithGoogleProfile } = useAuth();

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const tokenClientRef = useRef<any>(null);

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


  // Initialize Google OAuth2 Token Client (Method 2: 100% custom button without iframe)
  const initGoogleGIS = useCallback(() => {
    if (typeof window === "undefined") return;
    const google = (window as unknown as { google?: any })?.google;
    if (!google?.accounts?.oauth2 || !googleClientId) return;

    try {
      // 1. Token client for custom button click (enforcing account selection)
      tokenClientRef.current = google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: "openid email profile",
        prompt: "select_account",
        callback: async (tokenResponse: { access_token?: string; error?: string; error_description?: string }) => {
          if (tokenResponse.error) {
            setIsAuthenticating(false);
            if (tokenResponse.error !== "popup_closed_by_user") {
              setAuthError(tokenResponse.error_description || tokenResponse.error || "Sign in canceled");
            }
            return;
          }

          if (!tokenResponse.access_token) {
            setIsAuthenticating(false);
            return;
          }

          try {
            setIsAuthenticating(true);
            setAuthError(null);

            // Fetch userinfo directly from Google API
            const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
            });

            if (!res.ok) {
              throw new Error("Could not retrieve profile from Google");
            }

            const googleProfile = await res.json();
            if (!googleProfile.email) {
              throw new Error("No verified email returned from Google");
            }

            if (redirectParam) {
              try {
                localStorage.setItem("bnp_redirect_url", redirectParam);
              } catch {}
            }

            const { isClaimed } = await loginWithGoogleProfile({
              email: googleProfile.email,
              name: googleProfile.name,
              avatarUrl: googleProfile.picture,
            });

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
      });

      // 2. Disable One Tap so it never pops up in the corner
      if (google.accounts.id) {
        try {
          google.accounts.id.cancel();
        } catch {}
      }
    } catch (e) {
      console.warn("Google Identity Services initialization:", e);
    }
  }, [googleClientId, loginWithGoogleProfile, redirectParam, router]);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as unknown as { google?: any })?.google?.accounts?.oauth2) {
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

  const handleCustomGoogleClick = async () => {
    if (isAuthenticating) return;
    setAuthError(null);

    if (tokenClientRef.current) {
      // Trigger Google's popup flow directly, asking user to select account
      tokenClientRef.current.requestAccessToken({ prompt: "select_account" });
    } else {
      // Fallback if script hasn't loaded yet
      setIsAuthenticating(true);
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
            : "Google Sign-In failed. Please check your connection."
        );
      }
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

        {/* 100% Custom Beats & Pieces Button (No borders, pure pill CTA) */}
        <div className="w-full max-w-xs mb-10 flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={handleCustomGoogleClick}
            disabled={isAuthenticating}
            className="w-full py-3.5 px-6 rounded-3xl bg-white hover:bg-[#F2F2F2] text-black text-xs font-bold transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 select-none border-0"
          >
            {isAuthenticating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
              </>
            )}
          </button>
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
