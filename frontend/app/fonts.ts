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
});
