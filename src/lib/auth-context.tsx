"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserProfile } from "@/lib/types";
import { sampleProducers, currentUser as defaultAdminUser } from "@/lib/mock-data";

interface AuthContextType {
  user: UserProfile | null;
  isLoggedIn: boolean;
  loginWithEmail: (email: string) => { success: boolean; isMatchedProducer: boolean; user: UserProfile };
  loginWithUser: (producerId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "bnp_active_user_id";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);

  // Sync from localStorage on mount
  useEffect(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId && savedId !== "logged_out" && sampleProducers[savedId]) {
        setUser(sampleProducers[savedId]);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  const loginWithEmail = (emailInput: string) => {
    const cleanEmail = emailInput.trim().toLowerCase();
    
    // 1. Search sampleProducers for matching email
    const matchedEntry = Object.entries(sampleProducers).find(
      ([_, p]) => p.email.toLowerCase() === cleanEmail
    );

    if (matchedEntry) {
      const [id, matchedProfile] = matchedEntry;
      setUser(matchedProfile);
      try {
        localStorage.setItem(STORAGE_KEY, id);
      } catch {}
      return { success: true, isMatchedProducer: true, user: matchedProfile };
    }

    // 2. If not matched, create a new verified user account with this Google email
    const fallbackNickname = cleanEmail.split("@")[0] || "User";
    const newProfile: UserProfile = {
      id: `usr-${fallbackNickname.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
      nickname: fallbackNickname,
      email: cleanEmail,
      avatarUrl: "/avatars/default-avatar.png",
      role: "producer",
      createdAt: new Date().toISOString(),
    };

    setUser(newProfile);
    try {
      localStorage.setItem(STORAGE_KEY, newProfile.id);
    } catch {}

    return { success: true, isMatchedProducer: false, user: newProfile };
  };

  const loginWithUser = (producerId: string) => {
    if (sampleProducers[producerId]) {
      const profile = sampleProducers[producerId];
      setUser(profile);
      try {
        localStorage.setItem(STORAGE_KEY, producerId);
      } catch {}
    }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.setItem(STORAGE_KEY, "logged_out");
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
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
