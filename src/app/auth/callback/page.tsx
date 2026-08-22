"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { producerService } from "@/services/producerService";
import { UserProfile } from "@/lib/types";
import { Loader2, CheckCircle2, ShieldAlert } from "lucide-react";

const STORAGE_KEY = "bnp_active_user_id";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    async function handleAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        const sessionUser = data.session?.user;
        if (!sessionUser || !sessionUser.email) {
          // If no session found in URL hash/cookies, check getInitialSession or wait a tick
          const { data: userRes, error: userErr } = await supabase.auth.getUser();
          if (userErr || !userRes.user?.email) {
            throw new Error("Unable to retrieve authenticated Google account information.");
          }
        }

        const verifiedEmail = (data.session?.user?.email || "").toLowerCase().trim();
        const googleName = data.session?.user?.user_metadata?.full_name || verifiedEmail.split("@")[0];
        const googleAvatar = data.session?.user?.user_metadata?.avatar_url || "/avatars/default-avatar.png";

        // Check if verified email matches any known producer/admin in our registry
        const matchedProducer = producerService.getProducerByEmail(verifiedEmail);

        if (matchedProducer) {
          // Matched authentic producer/admin!
          localStorage.setItem(STORAGE_KEY, matchedProducer.id);
          setStatus("success");
          setTimeout(() => {
            router.push("/profile");
          }, 400);
        } else {
          // New verified community user
          const newUserId = `usr-${verifiedEmail.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "")}`;
          const newProfile: UserProfile = {
            id: newUserId,
            nickname: googleName,
            email: verifiedEmail,
            avatarUrl: googleAvatar,
            role: verifiedEmail === "adrian.hrihor@gmail.com" ? "admin" : "producer",
            createdAt: new Date().toISOString(),
          };

          producerService.updateProducer(newProfile.id, newProfile);
          localStorage.setItem(STORAGE_KEY, newProfile.id);
          setStatus("success");
          setTimeout(() => {
            router.push("/profile");
          }, 800);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Authentication failed.";
        console.error("Auth callback error:", err);
        setErrorMessage(message);
        setStatus("error");
      }
    }

    handleAuth();
  }, [router]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      {status === "loading" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <Loader2 className="w-10 h-10 text-brand animate-spin mx-auto" />
          <h2 className="text-lg font-bold text-white">Verifying Google Account...</h2>
          <p className="text-xs text-zinc-400">Authenticating and synchronizing your user profile.</p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-4 animate-in zoom-in-95 duration-200">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Signed in successfully!</h2>
          <p className="text-xs text-zinc-400">Redirecting to your dashboard...</p>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4 max-w-md bg-[#181818] rounded-2xl p-6 shadow-xl animate-in fade-in duration-200">
          <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Sign-In Failed</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">{errorMessage}</p>
          <button
            onClick={() => router.push("/signin")}
            className="px-6 py-2.5 rounded-xl bg-brand text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer mt-2"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
