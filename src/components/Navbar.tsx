"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { User as UserIcon, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { battleService } from "@/services";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { user: currentUser, isLoggedIn, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const isHost = Boolean(
    currentUser && (
      currentUser.role === "host" ||
      (currentUser.email && battleService.getBattlesByHost(currentUser.email).length > 0) ||
      (currentUser.nickname && battleService.getBattlesByHost(currentUser.nickname).length > 0)
    )
  );

  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("bnp_theme");
      if (savedTheme === "light") {
        setIsDarkMode(false);
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
      } else {
        setIsDarkMode(true);
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      }
    } catch {
      // ignore
    }
  }, []);

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => {
      const nextMode = !prev;
      if (!nextMode) {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
        try { localStorage.setItem("bnp_theme", "light"); } catch {}
      } else {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
        try { localStorage.setItem("bnp_theme", "dark"); } catch {}
      }
      return nextMode;
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = [
    { href: "/battles", label: "Battles" },
    { href: "/beats", label: "Beats" },
    { href: "/releases", label: "Releases" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#121212]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 h-20 flex items-center justify-between">
        
        {/* Left: Brand Logo & Main Nav */}
        <div className="flex items-center gap-12">
          {/* Authentic Beats & Pieces Logo from project */}
          <Link href="/battles" className="flex items-center group select-none">
            <div className="relative h-8 w-24 sm:w-28 flex items-center">
              <Image
                src="/logo.png"
                alt="Beats & Pieces"
                fill
                className="object-contain object-left group-hover:opacity-90 transition-opacity"
                priority
              />
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-9">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/battles"
                  ? pathname.startsWith("/battles") || pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-[15px] font-medium transition-colors ${
                    isActive
                      ? "text-white"
                      : "text-[#9E9E9E] hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Actions: Admin Panel link, Host Panel link, Avatar / Log in */}
        <div className="flex items-center gap-6">
          {mounted && currentUser?.role === "admin" && (
            <Link
              href="/admin"
              className={`text-[14px] font-semibold transition-colors flex items-center gap-1.5 ${
                pathname.startsWith("/admin")
                  ? "text-[#FF8A65]"
                  : "text-[#D1D1D1] hover:text-white"
              }`}
            >
              Admin Panel
            </Link>
          )}

          {mounted && currentUser?.role !== "admin" && isHost && (
            <Link
              href="/host"
              className={`text-[14px] font-semibold transition-colors flex items-center gap-1.5 ${
                pathname.startsWith("/host")
                  ? "text-[#FF8A65]"
                  : "text-[#D1D1D1] hover:text-white"
              }`}
            >
              Host Panel
            </Link>
          )}

          {/* User Avatar (if logged in) or 'Log in' button */}
          {mounted && isLoggedIn && currentUser ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-9 h-9 rounded-full overflow-hidden relative flex items-center justify-center focus:outline-none cursor-pointer"
              >
                <Image
                  src={currentUser.avatarUrl}
                  alt={currentUser.nickname}
                  fill
                  className="object-cover"
                />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-3 w-52 bg-[#181818] rounded-xl shadow-2xl py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-4 py-2.5">
                    <p className="text-sm font-bold text-white">{currentUser.nickname}</p>
                    <p className="text-xs text-[#888888] truncate">{currentUser.email}</p>
                  </div>

                  <Link
                    href="/profile"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#D1D1D1] hover:text-white hover:bg-[#7B61FF] transition-colors"
                  >
                    <UserIcon className="w-4 h-4" />
                    <span>User Profile</span>
                  </Link>

                  <button
                    onClick={() => {
                      logout();
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-400 hover:bg-[#262626] transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href={pathname && pathname !== "/signin" && pathname !== "/auth/callback" ? `/signin?redirect=${encodeURIComponent(pathname)}` : "/signin"}
              className="px-4 py-2 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white text-xs font-semibold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <span>Log in</span>
            </Link>
          )}

        </div>
      </div>
    </header>
  );
};
