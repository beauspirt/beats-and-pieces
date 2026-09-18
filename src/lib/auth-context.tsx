"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserProfile } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { producerService, activityLogService } from "@/services";

interface AuthContextType {
  user: UserProfile | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleIdToken: (idToken: string) => Promise<{ isClaimed: boolean; user: UserProfile }>;
  loginWithGoogleProfile: (profile: { email: string; name?: string; avatarUrl?: string }) => Promise<{ isClaimed: boolean; user: UserProfile }>;
  signInWithDiscord: () => Promise<void>;
  signUpNewProducer: (nickname: string, email: string) => { success: boolean; isNew: boolean; user: UserProfile };
  loginWithEmail: (email: string) => { success: boolean; isMatchedProducer: boolean; user: UserProfile };
  loginWithUser: (producerId: string) => void;
  updateUser: (updatedUser: UserProfile) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "bnp_active_user_id";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedId = localStorage.getItem(STORAGE_KEY);
        if (savedId && savedId !== "logged_out") {
          return producerService.getProducerById(savedId) || null;
        }
      } catch {}
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const savedId = localStorage.getItem(STORAGE_KEY);
        if (savedId && savedId !== "logged_out") {
          return false;
        }
      } catch {}
    }
    return false;
  });

  // Sync session on mount and listen to Supabase auth changes
  useEffect(() => {
    // 1. Check local storage cache
    try {
      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId && savedId !== "logged_out") {
        const prod = producerService.getProducerById(savedId);
        if (prod) {
          setUser(prod);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }

    // 2. Check active Supabase session (only if no explicit active user is already cached in localStorage)
    supabase.auth.getSession().then(({ data: { session } }) => {
      try {
        const savedId = localStorage.getItem(STORAGE_KEY);
        if (savedId && savedId !== "logged_out") {
          const current = producerService.getProducerById(savedId);
          if (current) {
            setUser(current);
            return;
          }
        }
        if (savedId === "logged_out") return;
      } catch {}

      if (session?.user?.email) {
        const email = session.user.email.toLowerCase().trim();
        const matched = producerService.getProducerByEmail(email);
        if (matched) {
          setUser(matched);
          try {
            localStorage.setItem(STORAGE_KEY, matched.id);
          } catch {}
        }
      }
    });

    // 3. Listen to auth state transitions
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === "SIGNED_IN" && session?.user?.email) {
        const email = session.user.email.toLowerCase().trim();
        const matched = producerService.getProducerByEmail(email);
        if (matched) {
          setUser(matched);
          try {
            localStorage.setItem(STORAGE_KEY, matched.id);
          } catch {}
        }
      } else if (_event === "SIGNED_OUT") {
        setUser(null);
        try {
          localStorage.setItem(STORAGE_KEY, "logged_out");
        } catch {}
      }
    });

    // 4. Listen to producer updates and background database sync
    const handleProducersUpdated = () => {
      try {
        const savedId = localStorage.getItem(STORAGE_KEY);
        if (savedId && savedId !== "logged_out") {
          const prod = producerService.getProducerById(savedId);
          if (prod) {
            setUser(prod);
          }
        }
      } catch {}
    };

    if (typeof window !== "undefined") {
      window.addEventListener("bnp_producers_updated", handleProducersUpdated);
    }

    return () => {
      subscription.unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener("bnp_producers_updated", handleProducersUpdated);
      }
    };
  }, []);

  // Ensure Google One Tap popup never lingers or appears once user is authenticated
  useEffect(() => {
    if (user && typeof window !== "undefined") {
      try {
        (window as unknown as { google?: any })?.google?.accounts?.id?.cancel();
        document.getElementById("credential_picker_container")?.remove();
        document.getElementById("credential_picker_iframe")?.remove();
      } catch {}
    }
  }, [user]);

  const signInWithGoogle = async () => {
    const callbackUrl = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : "";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });
    if (error) throw error;
  };

  const loginWithGoogleProfile = async ({
    email,
    name,
    avatarUrl,
  }: {
    email: string;
    name?: string;
    avatarUrl?: string;
  }): Promise<{ isClaimed: boolean; user: UserProfile }> => {
    const verifiedEmail = email.toLowerCase().trim();
    const googleName = name || verifiedEmail.split("@")[0];
    const googleAvatar = avatarUrl || "/avatars/default-avatar.png";

    try {
      await producerService.syncFromSupabase();
    } catch {}

    const matchedProducer = producerService.getProducerByEmail(verifiedEmail);
    if (matchedProducer) {
      try {
        localStorage.setItem(STORAGE_KEY, matchedProducer.id);
      } catch {}
      setUser(matchedProducer);
      activityLogService.logActivity({
        type: "auth.login",
        userId: matchedProducer.id,
        userNickname: matchedProducer.nickname,
        userAvatar: matchedProducer.avatarUrl,
        userRole: matchedProducer.role,
        description: `Producer '${matchedProducer.nickname}' signed in with Google`,
        metadata: { provider: "google", email: verifiedEmail },
      });
      return { isClaimed: !!matchedProducer.isClaimed, user: matchedProducer };
    } else {
      const cleanId = (googleName || verifiedEmail.split("@")[0] || "user")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") || String(Date.now());

      const newProfile: UserProfile = {
        id: cleanId,
        nickname: googleName,
        email: verifiedEmail,
        avatarUrl: googleAvatar,
        role: verifiedEmail === "adrian.hrihor@gmail.com" ? "admin" : "producer",
        isClaimed: false,
        createdAt: new Date().toISOString(),
      };

      producerService.updateProducer(newProfile.id, newProfile);
      try {
        localStorage.setItem(STORAGE_KEY, newProfile.id);
      } catch {}
      setUser(newProfile);
      activityLogService.logActivity({
        type: "auth.signup",
        userId: newProfile.id,
        userNickname: newProfile.nickname,
        userAvatar: newProfile.avatarUrl,
        userRole: newProfile.role,
        description: `New user '${newProfile.nickname}' registered via Google`,
        metadata: { provider: "google", email: verifiedEmail },
      });
      return { isClaimed: false, user: newProfile };
    }
  };

  const signInWithGoogleIdToken = async (idToken: string): Promise<{ isClaimed: boolean; user: UserProfile }> => {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });
    if (error) throw error;

    const sessionUser = data.session?.user;
    if (!sessionUser || !sessionUser.email) {
      throw new Error("Unable to retrieve authenticated Google account information.");
    }

    return loginWithGoogleProfile({
      email: sessionUser.email,
      name: sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name,
      avatarUrl: sessionUser.user_metadata?.avatar_url || sessionUser.user_metadata?.picture,
    });
  };

  const signInWithDiscord = async () => {
    const callbackUrl = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : "";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: callbackUrl,
      },
    });
    if (error) throw error;
  };

  const loginWithEmail = (emailInput: string) => {
    const cleanEmail = emailInput.trim().toLowerCase();
    
    // Search producer registry for matching email
    const matched = producerService.getProducerByEmail(cleanEmail);

    if (matched) {
      setUser(matched);
      try {
        localStorage.setItem(STORAGE_KEY, matched.id);
      } catch {}

      activityLogService.logActivity({
        type: "auth.login",
        userId: matched.id,
        userNickname: matched.nickname,
        userAvatar: matched.avatarUrl,
        userRole: matched.role,
        description: `Producer '${matched.nickname}' signed in via Email`,
        metadata: { provider: "email", email: cleanEmail },
      });

      return { success: true, isMatchedProducer: true, user: matched };
    }

    // New profile fallback
    const fallbackNickname = cleanEmail.split("@")[0] || "User";
    const newProfile: UserProfile = {
      id: fallbackNickname.toLowerCase().replace(/[^a-z0-9]/g, "") || String(Date.now()),
      nickname: fallbackNickname,
      email: cleanEmail,
      avatarUrl: "/avatars/default-avatar.png",
      role: cleanEmail === "adrian.hrihor@gmail.com" ? "admin" : "producer",
      createdAt: new Date().toISOString(),
    };

    producerService.updateProducer(newProfile.id, newProfile);
    setUser(newProfile);
    try {
      localStorage.setItem(STORAGE_KEY, newProfile.id);
    } catch {}

    activityLogService.logActivity({
      type: "auth.signup",
      userId: newProfile.id,
      userNickname: newProfile.nickname,
      userAvatar: newProfile.avatarUrl,
      userRole: newProfile.role,
      description: `New user '${newProfile.nickname}' registered via Email`,
      metadata: { provider: "email", email: cleanEmail },
    });

    return { success: true, isMatchedProducer: false, user: newProfile };
  };

  const signUpNewProducer = (nickname: string, email: string) => {
    const cleanNick = nickname.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanId = cleanNick.toLowerCase().replace(/[^a-z0-9]/g, "") || String(Date.now());

    // Check if account already exists with this email or id
    const existing = producerService.getProducerByEmail(cleanEmail) || producerService.getProducerById(cleanId);
    if (existing) {
      setUser(existing);
      try {
        localStorage.setItem(STORAGE_KEY, existing.id);
      } catch {}

      activityLogService.logActivity({
        type: "auth.login",
        userId: existing.id,
        userNickname: existing.nickname,
        userAvatar: existing.avatarUrl,
        userRole: existing.role,
        description: `Producer '${existing.nickname}' signed in`,
        metadata: { provider: "direct", email: cleanEmail },
      });

      return { success: true, isNew: false, user: existing };
    }

    const newProfile: UserProfile = {
      id: cleanId,
      nickname: cleanNick,
      email: cleanEmail,
      avatarUrl: "/avatars/default-avatar.png",
      role: cleanEmail === "adrian.hrihor@gmail.com" ? "admin" : "producer",
      isClaimed: true,
      createdAt: new Date().toISOString(),
    };

    producerService.updateProducer(newProfile.id, newProfile);
    setUser(newProfile);
    try {
      localStorage.setItem(STORAGE_KEY, newProfile.id);
    } catch {}

    activityLogService.logActivity({
      type: "auth.signup",
      userId: newProfile.id,
      userNickname: newProfile.nickname,
      userAvatar: newProfile.avatarUrl,
      userRole: newProfile.role,
      description: `New producer '${newProfile.nickname}' registered account`,
      metadata: { email: cleanEmail },
    });

    return { success: true, isNew: true, user: newProfile };
  };

  const loginWithUser = (producerId: string) => {
    const prod = producerService.getProducerById(producerId);
    if (prod) {
      setUser(prod);
      try {
        localStorage.setItem(STORAGE_KEY, producerId);
      } catch {}

      activityLogService.logActivity({
        type: "auth.login",
        userId: prod.id,
        userNickname: prod.nickname,
        userAvatar: prod.avatarUrl,
        userRole: prod.role,
        description: `Signed in as '${prod.nickname}' (${prod.role})`,
        metadata: { provider: "switcher", email: prod.email },
      });
    }
  };

  const updateUser = (updatedUser: UserProfile) => {
    setUser(updatedUser);
    try {
      localStorage.setItem(STORAGE_KEY, updatedUser.id);
    } catch {}
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      localStorage.setItem(STORAGE_KEY, "logged_out");
    } catch {}

    try {
      await supabase.auth.signOut();
    } catch {}

    if (typeof window !== "undefined") {
      window.location.replace("/signin");
    } else {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isLoading,
        signInWithGoogle,
        signInWithGoogleIdToken,
        loginWithGoogleProfile,
        signInWithDiscord,
        signUpNewProducer,
        loginWithEmail,
        loginWithUser,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
