import { useEffect } from "react";

/**
 * Custom hook to lock document & body scroll when a modal or overlay is open.
 * Restores original overflow when closed or unmounted.
 */
export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (typeof window === "undefined" || !isLocked) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    // Lock both root html and body so neither container can scroll
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow || "";
      document.body.style.overflow = originalBodyOverflow || "";
    };
  }, [isLocked]);
}
