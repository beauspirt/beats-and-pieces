"use client";

import React, { useState } from "react";
import { Flame } from "lucide-react";

interface FlameRatingProps {
  value?: number; // 1 to 5 or float (e.g. 3.4)
  readOnly?: boolean;
  onChange?: (rating: number) => void;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
}

export const FlameRating: React.FC<FlameRatingProps> = ({
  value = 0,
  readOnly = false,
  onChange,
  size = "md",
  showValue = false,
}) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-7 h-7",
  };

  const currentVal = hoverRating !== null ? hoverRating : value;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((flameIndex) => {
          const isFilled = flameIndex <= Math.round(currentVal);
          return (
            <button
              key={flameIndex}
              type="button"
              disabled={readOnly}
              onClick={() => onChange && onChange(flameIndex)}
              onMouseEnter={() => !readOnly && setHoverRating(flameIndex)}
              onMouseLeave={() => !readOnly && setHoverRating(null)}
              className={`transition-all duration-150 ${
                readOnly
                  ? "cursor-default"
                  : "cursor-pointer hover:scale-125 active:scale-95"
              }`}
              aria-label={`Rate ${flameIndex} flames`}
            >
              <Flame
                className={`${iconSizes[size]} transition-colors ${
                  isFilled
                    ? "text-[#FF5E3A] fill-[#FF5E3A] drop-shadow-[0_0_8px_rgba(255,94,58,0.5)]"
                    : "text-zinc-600 fill-transparent hover:text-zinc-400"
                }`}
              />
            </button>
          );
        })}
      </div>

      {showValue && (
        <span className="text-sm font-bold text-[#FF5E3A] ml-1 font-mono">
          {value > 0 ? value.toFixed(2) : "-"}
        </span>
      )}
    </div>
  );
};
