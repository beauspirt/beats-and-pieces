"use client";

import React from "react";

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: "top" | "bottom";
  className?: string;
}

export function Tooltip({
  content,
  children,
  position = "top",
  className = "",
}: TooltipProps) {
  return (
    <div className={`group/tooltip relative inline-flex items-center ${className}`}>
      {children}
      <div
        className={`absolute ${
          position === "top" ? "bottom-full mb-2" : "top-full mt-2"
        } left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#1E1E1E] text-white text-[11px] font-semibold rounded-lg shadow-2xl whitespace-nowrap pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-all duration-150 z-50 flex items-center gap-1 leading-none select-none`}
      >
        <span>{content}</span>
        <div
          className={`absolute ${
            position === "top"
              ? "top-full border-t-[#1E1E1E]"
              : "bottom-full border-b-[#1E1E1E]"
          } left-1/2 -translate-x-1/2 border-4 border-transparent`}
        />
      </div>
    </div>
  );
}
