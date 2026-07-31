import type { MetadataRoute } from "next";

/**
 * Web app manifest.
 *
 * Mainly earns its place on mobile: without one, a visitor who adds the site to
 * their home screen gets the URL as the label and a screenshot for an icon.
 * It also silences the "no manifest" item in Lighthouse's PWA audit.
 *
 * `display: "browser"` rather than "standalone" — this is a marketing site, and
 * standalone would strip the address bar and back button from a saved shortcut,
 * which is disorienting for something people expect to behave like a web page.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Beacon — Global Advisory Partner for Business Growth",
    short_name: "Beacon",
    description:
      "Business incorporation, consultation, accounting, audit and technology services across the GCC.",
    start_url: "/",
    display: "browser",
    background_color: "#ffffff",
    theme_color: "#13670b",
    icons: [
      {
        // The brand mark, already served by app/icon.svg. SVG scales to every
        // launcher size, so one entry covers what would otherwise be a set of
        // hand-generated PNGs.
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/favicon.ico",
        sizes: "32x32",
        type: "image/x-icon",
      },
    ],
  };
}
