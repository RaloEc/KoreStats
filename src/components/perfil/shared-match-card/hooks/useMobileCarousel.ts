import React from "react";

export const useMobileCarousel = (totalPages: number) => {
  const mobileCarouselRef = React.useRef<HTMLDivElement | null>(null);
  const [mobileCarouselIndex, setMobileCarouselIndex] = React.useState(0);

  React.useEffect(() => {
    const el = mobileCarouselRef.current;
    if (!el) return;

    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        const children = Array.from(el.children) as HTMLElement[];
        if (children.length === 0) return;

        const scrollLeft = el.scrollLeft;
        let bestIndex = 0;
        let bestDistance = Number.POSITIVE_INFINITY;

        for (let i = 0; i < children.length; i += 1) {
          const distance = Math.abs(children[i].offsetLeft - scrollLeft);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = i;
          }
        }

        setMobileCarouselIndex(bestIndex);
      });
    };

    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (rafId != null) window.cancelAnimationFrame(rafId);
      el.removeEventListener("scroll", onScroll);
    };
  }, [totalPages]);

  return { mobileCarouselRef, mobileCarouselIndex };
};
