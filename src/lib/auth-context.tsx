"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserProfile } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { producerService } from "@/services/producerService";

interface AuthContextType {
  user: UserProfile | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithDiscord: () => Promise<void>;
  signUpNewProducer: (nickname: string, email: string) => { success: boolean; isNew: boolean; user: UserProfile };
  loginWithEmail: (email: string) => { success: boolean; isMatchedProducer: boolean; user: UserProfile };
  loginWithUser: (producerId: string) => void;
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

    // 2. Check active Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
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
      if (session?.user?.email) {
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
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
      return { success: true, isMatchedProducer: true, user: matched };
    }

    // New profile fallback
    const fallbackNickname = cleanEmail.split("@")[0] || "User";
    const newProfile: UserProfile = {
      id: `usr-${fallbackNickname.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
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

    return { success: true, isMatchedProducer: false, user: newProfile };
  };

  const signUpNewProducer = (nickname: string, email: string) => {
    const cleanNick = nickname.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanId = `usr-${cleanNick.toLowerCase().replace(/[^a-z0-9]/g, "") || Date.now()}`;

    // Check if account already exists with this email or id
    const existing = producerService.getProducerByEmail(cleanEmail) || producerService.getProducerById(cleanId);
    if (existing) {
      setUser(existing);
      try {
        localStorage.setItem(STORAGE_KEY, existing.id);
      } catch {}
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

    return { success: true, isNew: true, user: newProfile };
  };

  const loginWithUser = (producerId: string) => {
    const prod = producerService.getProducerById(producerId);
    if (prod) {
      setUser(prod);
      try {
        localStorage.setItem(STORAGE_KEY, producerId);
      } catch {}
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, "logged_out");
    } catch {}

    if (typeof window !== "undefined") {
      window.location.href = "/signin";
    }

    try {
      await supabase.auth.signOut();
    } catch {}
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isLoading,
        signInWithGoogle,
        signInWithDiscord,
        signUpNewProducer,
        loginWithEmail,
        loginWithUser,
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
