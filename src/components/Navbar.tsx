"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { User as UserIcon, Settings, LogOut, Menu, X, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { battleService } from "@/services";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { user: currentUser, isLoggedIn, logout, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Close mobile menu whenever route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setShowProfileMenu(false);
  }, [pathname]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("bnp_theme");
      if (stored === "light") {
        setIsDarkMode(false);
        document.documentElement.classList.remove("dark");
      } else {
        setIsDarkMode(true);
        document.documentElement.classList.add("dark");
      }
    } catch {
      // Default to dark mode
    }
  }, []);

  // Click outside to close user dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = [
    { href: "/battles", label: "Battles" },
    { href: "/beats", label: "Beats" },
    { href: "/vault", label: "Vault" },
    { href: "/releases", label: "Releases" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#121212]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Left: Brand Logo & Wordmark */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                <span className="font-black text-base tracking-tighter leading-none">B</span>
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-sm tracking-tight text-white group-hover:text-brand transition-colors">
                  BEATS & PIECES
                </span>
                <span className="text-[10px] text-zinc-400 font-medium -mt-1 tracking-wider uppercase">
                  Beat Battle Platform
                </span>
              </div>
            </Link>

            {/* Desktop Nav Links */}
            <nav className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => {
                const isActive =
                  link.href === "/battles"
                    ? pathname.startsWith("/battles") || pathname === "/"
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? "text-white bg-white/5"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Mobile Menu Trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 focus:outline-none cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Desktop Admin Link */}
            {mounted && currentUser?.role === "admin" && (
              <Link
                href="/admin"
                className={`hidden sm:flex text-[14px] font-semibold transition-colors items-center gap-1.5 ${
                  pathname.startsWith("/admin")
                    ? "text-[#FF8A65]"
                    : "text-[#D1D1D1] hover:text-white"
                }`}
              >
                Admin Panel
              </Link>
            )}

            {/* Desktop Host Link */}
            {mounted && currentUser?.role !== "admin" && isHost && (
              <Link
                href="/host"
                className={`hidden sm:flex text-[14px] font-semibold transition-colors items-center gap-1.5 ${
                  pathname.startsWith("/host")
                    ? "text-[#FF8A65]"
                    : "text-[#D1D1D1] hover:text-white"
                }`}
              >
                Host Panel
              </Link>
            )}

            {/* User Avatar Dropdown (To the right of the burger menu) */}
            {mounted && !isLoading ? (
              isLoggedIn && currentUser ? (
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden relative flex items-center justify-center focus:outline-none cursor-pointer ring-1 ring-white/10 hover:opacity-85 transition-opacity"
                    aria-label="Open profile menu"
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
                        <p className="text-sm font-bold text-white truncate">{currentUser.nickname}</p>
                        <p className="text-xs text-[#888888] truncate">{currentUser.email}</p>
                      </div>

                      <Link
                        href={`/${currentUser.id}`}
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#D1D1D1] hover:text-white hover:bg-[#7B61FF] transition-colors"
                      >
                        <UserIcon className="w-4 h-4" />
                        <span>Your Page</span>
                      </Link>

                      <Link
                        href="/profile"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#D1D1D1] hover:text-white hover:bg-[#7B61FF] transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Edit Profile</span>
                      </Link>

                      {currentUser?.role === "admin" && (
                        <Link
                          href="/admin"
                          onClick={() => setShowProfileMenu(false)}
                          className="sm:hidden flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#FF8A65] hover:bg-[#262626] transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                          <span>Admin Panel</span>
                        </Link>
                      )}

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
                  className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white text-xs sm:text-sm font-semibold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                >
                  <span>Log in</span>
                </Link>
              )
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 opacity-0" />
            )}

          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#141414] border-b border-white/10 px-4 py-4 space-y-2 animate-in slide-in-from-top-2 duration-200 shadow-2xl">
            <nav className="flex flex-col space-y-1">
              {navLinks.map((link) => {
                const isActive =
                  link.href === "/battles"
                    ? pathname.startsWith("/battles") || pathname === "/"
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-between ${
                      isActive
                        ? "bg-[#7B61FF] text-white shadow-md"
                        : "text-zinc-300 hover:bg-[#1f1f1f] hover:text-white"
                    }`}
                  >
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Spacer to preserve exact layout flow across all pages */}
      <div className="h-20 sm:h-24 shrink-0" aria-hidden="true" />
    </>
  );
};
