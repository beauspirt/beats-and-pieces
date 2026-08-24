import { useEffect } from "react";

/**
 * Custom hook to lock body scroll when a modal or overlay is open.
 * Restores original body overflow when closed or unmounted.
 */
export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (typeof window === "undefined" || !isLocked) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow || "";
    };
  }, [isLocked]);
}
