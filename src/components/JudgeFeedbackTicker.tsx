"use client";

import React, { useState, useEffect } from "react";
import { JudgeFeedbackItem } from "@/lib/types";

interface JudgeFeedbackTickerProps {
  feedbacks: JudgeFeedbackItem[];
  className?: string;
}

export function JudgeFeedbackTicker({
  feedbacks,
  className = "",
}: JudgeFeedbackTickerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!feedbacks || feedbacks.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % feedbacks.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [feedbacks]);

  if (!feedbacks || feedbacks.length === 0) return null;

  const validFeedbacks = feedbacks.filter((f) => Boolean(f && f.feedback && f.feedback.trim()));
  if (validFeedbacks.length === 0) return null;

  const current = validFeedbacks[currentIndex] || validFeedbacks[0];

  return (
    <div className={`bg-[#121212] rounded-2xl px-3.5 py-2 flex items-center justify-between gap-2 text-xs border border-white/[0.04] ${className}`}>
      <div className="flex-1 flex items-baseline gap-2 min-w-0 transition-all duration-300">
        <span className="font-bold text-[#7B61FF] shrink-0 text-xs">
          {current.judgeName || "Judge"}:
        </span>
        <span className="text-[#C4C4C4] italic truncate sm:whitespace-normal text-xs">
          &ldquo;{current.feedback}&rdquo;
        </span>
      </div>

      {validFeedbacks.length > 1 && (
        <div className="flex items-center gap-1.5 shrink-0 select-none">
          {validFeedbacks.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentIndex(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? "bg-[#7B61FF] scale-125"
                  : "bg-[#444444] hover:bg-[#666666]"
              }`}
              title={`Feedback from ${validFeedbacks[i].judgeName}`}
            />
          ))}
          <span className="text-xs text-[#666666] ml-1">
            {currentIndex + 1}/{validFeedbacks.length}
          </span>
        </div>
      )}
    </div>
  );
}
