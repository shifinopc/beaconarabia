"use client";

import { useEffect, useRef, useState } from "react";

export interface StatItem {
  label: string;
  value: number;
  suffix?: string;
}

/** Used only if the CMS has no stats for this region. */
const FALLBACK_STATS: StatItem[] = [
  { value: 1000, suffix: "+", label: "Happy Clients" },
  { value: 50, suffix: "+", label: "Employees" },
  { value: 4, suffix: "+", label: "Years of Experience" },
  { value: 7, suffix: "", label: "Locations" },
];

const DURATION_MS = 1500;

/**
 * Animated stat counters.
 *
 * Ported from bg-Beacon/src/app/components/Stats.js. Rewritten in two ways:
 *  - four duplicated useState counters and a setInterval per counter become one
 *    requestAnimationFrame loop, so the numbers stay in sync and the animation
 *    doesn't drift on slow frames
 *  - the resize listener that swapped between two identical background image
 *    URLs (largeBackgroundImageUrl === smallBackgroundImageUrl in the original)
 *    is dropped; the padding it also computed now lives in CSS
 *
 * Respects prefers-reduced-motion by leaving the final values in place.
 */
export default function Stats({
  useBackgroundImage = true,
  stats,
}: {
  useBackgroundImage?: boolean;
  /** From the CMS; falls back to the original figures when empty. */
  stats?: StatItem[];
}) {
  const items = stats?.length ? stats : FALLBACK_STATS;

  /**
   * Seeded with the real figures, not zero.
   *
   * Starting at zero meant the server rendered `<h2>0</h2>` and only a browser
   * running JavaScript ever saw the true number — so every crawler, AI model and
   * quality rater reading the HTML was told this company has 0 employees and 0
   * years of experience. The animation is a flourish; the figures are the
   * content, and the content has to exist without JavaScript.
   */
  const [counts, setCounts] = useState(() => items.map((s) => s.value));
  const ref = useRef<HTMLDivElement>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /**
     * Skip the animation entirely when the banner is already on screen at load,
     * so the visitor never sees the real numbers flash away and count back.
     */
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return;

    /**
     * Zeroing happens inside the observer, not here.
     *
     * Setting counts to 0 up-front fixed the server-rendered HTML but not the
     * rendered DOM: for a banner below the fold, hydration replaced the real
     * figures with 0 and left them there until someone scrolled. A crawler that
     * executes JavaScript — Googlebot, Lighthouse, an AI agent — renders the
     * page, never scrolls, and reads "0 Employees, 0 Years of Experience". An
     * external audit caught exactly that after the previous fix shipped.
     *
     * Deferring the reset until the element actually enters the viewport means
     * the DOM holds the true values for anything that does not scroll, and the
     * count-up still plays for anyone who does. The first animation frame
     * supplies the zero, so no separate reset is needed at all.
     */
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || hasRun.current) continue;
          hasRun.current = true;

          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - start) / DURATION_MS, 1);
            // easeOutQuad
            const eased = 1 - (1 - progress) * (1 - progress);
            setCounts(items.map((s) => Math.round(s.value * eased)));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);

          observer.unobserve(node);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="greenBannerContiner"
      ref={ref}
      style={{
        backgroundImage: useBackgroundImage ? "url(/NewSvgs/Backgrounds/bg4.webp)" : "none",
        backgroundColor: useBackgroundImage ? "transparent" : "#024a04",
      }}
    >
      <div className="statsContiner">
        {items.map((stat, i) => (
          <div className="statContainer" key={stat.label}>
            {/* A figure, not a section heading — but it stays a heading element
                because `.greenBannerContiner :is(h1..h6)` is what styles it. */}
            <h2>
              {counts[i]}
              {stat.suffix}
            </h2>
            <p>{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
