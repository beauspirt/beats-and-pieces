"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { User as UserIcon, LogOut } from "lucide-react";
import { currentUser } from "@/lib/mock-data";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const adminMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

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
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
        setShowAdminMenu(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = [
    { href: "/battles", label: "Competitions" },
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
                  className={`text-[15px] transition-colors ${
                    isActive
                      ? "text-white font-bold"
                      : "text-[#9E9E9E] hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Actions: Admin Panel dropdown, Theme Switch, Avatar */}
        <div className="flex items-center gap-6">
          
          {/* Admin Panel Dropdown */}
          {currentUser.role === "admin" && (
            <div className="relative" ref={adminMenuRef}>
              <button
                onClick={() => setShowAdminMenu(!showAdminMenu)}
                className={`text-[14px] font-semibold transition-colors flex items-center gap-1.5 ${
                  pathname.startsWith("/admin") || showAdminMenu
                    ? "text-[#FF8A65]"
                    : "text-[#D1D1D1] hover:text-white"
                }`}
              >
                <span>Admin Panel</span>
              </button>

              {/* Admin Panel Dropdown Menu */}
              {showAdminMenu && (
                <div className="absolute right-0 mt-3 w-56 bg-[#181818] rounded-xl shadow-2xl overflow-hidden py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <Link
                    href="/admin/new-battle"
                    onClick={() => setShowAdminMenu(false)}
                    className="block px-4 py-2.5 text-[13px] font-medium text-[#D1D1D1] hover:text-white hover:bg-[#7B61FF] transition-colors"
                  >
                    New Competition
                  </Link>

                  <Link
                    href="/battles"
                    onClick={() => setShowAdminMenu(false)}
                    className="block px-4 py-2.5 text-[13px] font-medium text-[#D1D1D1] hover:text-white hover:bg-[#7B61FF] transition-colors"
                  >
                    Edit Competition(s)
                  </Link>

                  <Link
                    href="/admin/new-release"
                    onClick={() => setShowAdminMenu(false)}
                    className="block px-4 py-2.5 text-[13px] font-medium text-[#D1D1D1] hover:text-white hover:bg-[#7B61FF] transition-colors"
                  >
                    New Release
                  </Link>

                  <Link
                    href="/releases"
                    onClick={() => setShowAdminMenu(false)}
                    className="block px-4 py-2.5 text-[13px] font-medium text-[#D1D1D1] hover:text-white hover:bg-[#7B61FF] transition-colors"
                  >
                    Edit Release(s)
                  </Link>

                  <Link
                    href="/admin/moderation"
                    onClick={() => setShowAdminMenu(false)}
                    className="block px-4 py-2.5 text-[13px] font-medium text-[#FF8A65] hover:text-white hover:bg-[#FF5E3A] transition-colors"
                  >
                    Voting Moderation
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* REFINED THEME TOGGLE (Exact Pixel-Centered Math & Equal Top/Bottom Padding) */}
          <button
            onClick={handleToggleTheme}
            className={`w-[64px] h-[32px] rounded-full p-[3px] flex items-center justify-between relative cursor-pointer select-none transition-all active:scale-95 group ${
              isDarkMode
                ? "bg-[#0E0E0E] shadow-inner"
                : "bg-[#E4E4E7] ring-1 ring-inset ring-[#D4D4D8] shadow-inner"
            }`}
            title="Toggle light/dark mode"
            aria-label="Toggle light/dark mode"
          >
            {/* Sliding Circular Thumb Highlight (Vertically Centered with exact equal top/bottom padding) */}
            <div
              className={`w-[26px] h-[26px] rounded-full absolute top-1/2 -translate-y-1/2 transition-all duration-200 pointer-events-none ${
                isDarkMode
                  ? "left-[35px] bg-[#1F1F1F] shadow-sm"
                  : "left-[3px] bg-white shadow-md"
              }`}
            />

            {/* Left Slot: Sun Icon (Exact 26x26 Centering) */}
            <div className="w-[26px] h-[26px] flex items-center justify-center relative z-10 shrink-0">
              <svg
                className={`w-3.5 h-3.5 transition-colors duration-200 ${
                  !isDarkMode ? "text-[#D97706]" : "text-[#444444]"
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="5" fill="currentColor" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            </div>

            {/* Right Slot: Crescent Moon Icon (Exact 26x26 Centering) */}
            <div className="w-[26px] h-[26px] flex items-center justify-center relative z-10 shrink-0">
              <svg
                className={`w-3.5 h-3.5 transition-colors duration-200 ${
                  isDarkMode ? "text-[#F4F6E6] fill-[#F4F6E6]" : "text-[#9CA3AF] fill-[#9CA3AF]"
                }`}
                viewBox="0 0 24 24"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            </div>
          </button>

          {/* User Avatar & Dropdown */}
          {isLoggedIn ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-9 h-9 rounded-full overflow-hidden relative flex items-center justify-center focus:outline-none"
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
                      setIsLoggedIn(false);
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-400 hover:bg-[#262626] transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/signin"
              className="px-4 py-2 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white text-xs font-semibold transition-all shadow-md active:scale-95"
            >
              Sign in
            </Link>
          )}

        </div>
      </div>
    </header>
  );
};
