"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // Scroll id="main-scroll-container" (layout container)
    const mainContainer = document.getElementById("main-scroll-container");
    if (mainContainer) {
      mainContainer.scrollTop = 0;
    }

    // Fallback: also try to scroll window (in case layout changes)
    window.scrollTo(0, 0);

    // Double check specific to body if needed, but window.scrollTo usually covers it
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }, [pathname]);

  return null;
}
