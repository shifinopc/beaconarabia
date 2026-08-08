import localFont from "next/font/local";

/**
 * Sora — the brand typeface, carried over from the legacy sites.
 * Self-hosted woff2 files, same weights the previous design shipped.
 */
export const sora = localFont({
  src: [
    { path: "./fonts/Sora-Light.woff2", weight: "300", style: "normal" },
    { path: "./fonts/Sora-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Sora-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Sora-SemiBold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-sora",
  display: "swap",
  /**
   * Not preloaded — a deliberate LCP trade, and reversible by deleting this
   * line if the swap flash proves objectionable.
   *
   * Preloading put all four weights (97 KB) at the front of the critical path:
   * more bytes than the HTML and CSS combined, fetched at high priority before
   * the page could paint, on a page whose mobile LCP was consistently failing
   * at ~6.5s. next/font offers no per-weight preload, so the choice is all
   * four or none.
   *
   * Without preload the fonts still load early — the @font-face rules are in
   * the first stylesheet — but no longer ahead of the hero image and CSS.
   * `display: swap` above means text is never invisible: it paints immediately
   * in the fallback and re-renders when Sora arrives. The cost is that brief
   * fallback flash on a cold cache.
   */
  preload: false,
});
