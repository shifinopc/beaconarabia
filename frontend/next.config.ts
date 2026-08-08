import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

/**
 * Directory of this config file.
 *
 * Turbopack's workspace root must be pinned because the repo root also has a
 * lockfile (for the dev runner), which makes it infer the wrong directory.
 *
 * Neither of the obvious ways to express "this folder" works here:
 *  - `__dirname` can resolve to the transpiled config's location
 *  - `process.cwd()` is the *parent*, because the dev script is launched via
 *    `npm --prefix frontend run dev`, which does not change the working
 *    directory
 *
 * Both failure modes are silent: Turbopack simply finds no `app/` directory and
 * every route 404s with no error. Resolving from this file's own URL is the
 * only form that is correct regardless of how the process was started.
 */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * Baseline security headers, applied to every response.
 *
 * A strict Content-Security-Policy is deliberately not included. Getting one
 * right here means allowlisting EmailJS, the Strapi media host and the inline
 * styles the ported legacy stylesheet relies on; a policy written without
 * verifying each of those tends to either break the site or be so permissive it
 * provides nothing. The headers below are unambiguous wins that need no
 * per-origin research.
 */
/**
 * Content-Security-Policy.
 *
 * Built from an audit of what the live pages actually request, not from a
 * template: the CMS media host, Google Analytics, Cloudflare's analytics beacon,
 * and nothing else. Anything an injected script would want to reach — an
 * attacker's own domain, an arbitrary endpoint to exfiltrate a form submission
 * to — is not on this list, which is the point.
 *
 * `'unsafe-inline'` is present for both scripts and styles, and is load-bearing
 * rather than laziness:
 *   - Next inlines its hydration bootstrap as a `<script>` with no nonce
 *     available to a statically exported page.
 *   - The ported legacy design uses 75 inline `style=` attributes on the
 *     homepage alone; removing them is a rewrite of the whole stylesheet.
 * A nonce-based policy needs per-request rendering, which would undo the
 * prerendering that keeps this site fast and, on this host, up at all.
 *
 * So this is a meaningful reduction in what an injected script can do, not the
 * strictest possible policy. `object-src 'none'` and `frame-ancestors 'self'`
 * are absolute, and both close real attack classes.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://static.cloudflareinsights.com https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  // The CMS serves every content image; data:/blob: cover inlined SVGs.
  "img-src 'self' data: blob: https://cms.beaconarabia.com https://www.googletagmanager.com",
  "font-src 'self' data:",
  // GA and Cloudflare analytics beacons, plus the CMS for form submission.
  "connect-src 'self' https://cms.beaconarabia.com https://www.google-analytics.com https://static.cloudflareinsights.com https://challenges.cloudflare.com",
  /**
   * Turnstile is the only thing this site frames, and it frames itself: the
   * widget injects an iframe from challenges.cloudflare.com.
   *
   * Listed here even though Turnstile is currently inactive (neither
   * TURNSTILE_SECRET_KEY nor NEXT_PUBLIC_TURNSTILE_SITE_KEY is set in
   * production, so TurnstileWidget renders nothing). Without these entries,
   * setting those keys would appear to work and then silently fail at the CSP —
   * a bot-protection outage that looks like a broken form. Allowing one known
   * origin to be framed costs nothing while the widget is off.
   */
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  // Forms post to our own API route only.
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // Two years, matching the preload-list requirement. Safe here because both
  // beaconarabia.com and cms.beaconarabia.com are HTTPS-only behind Cloudflare
  // — if any subdomain ever needs plain HTTP, drop includeSubDomains first.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Stops browsers second-guessing Content-Type, which is how an uploaded file
  // ends up executed as script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Clickjacking: nothing here is meant to be framed by another site.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Send the full URL to ourselves, origin-only cross-site, nothing when
  // downgrading to HTTP.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // The site asks for none of these; denying them means an injected script
  // can't either.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },

  /**
   * Build parallelism.
   *
   * Next sizes its static-generation worker pool from `os.cpus().length`. On
   * the shared host that reports 32, so it spawns ~26 workers and dies part-way
   * through page generation with `OS can't spawn worker thread: Resource
   * temporarily unavailable` — the account's process/thread limit, not memory.
   *
   * `taskset` does not help: it constrains CPU affinity, but `os.cpus()` still
   * reports every core, so the pool is sized the same. This is the only lever
   * that actually changes the worker count.
   *
   * Driven by env so local builds keep full parallelism (a few seconds) while
   * the constrained host can ask for one worker: NEXT_BUILD_CPUS=1.
   */
  experimental: {
    ...(process.env.NEXT_BUILD_CPUS
      ? { cpus: Math.max(1, parseInt(process.env.NEXT_BUILD_CPUS, 10) || 1) }
      : {}),
  },
  // Drops the `X-Powered-By: Next.js` header — a free version fingerprint that
  // tells an attacker which framework CVEs to try.
  poweredByHeader: false,

  /**
   * Canonicalise the host, and rescue the legacy URLs.
   *
   * Both www and apex currently answer 200 with no redirect between them, while
   * every canonical tag names the apex — so the two hostnames compete for the
   * same content and split whatever link equity the site earns.
   *
   * The /pages/* paths are the old sites' URL scheme. They 404 today, but
   * Google still has them indexed, so real visitors and real backlink equity
   * are landing on dead ends. 301 rather than 302 because these moves are
   * permanent and we want the equity to transfer.
   *
   * The old regional subdomains (ksa./uae.beaconarabia.com) cannot be handled
   * here — they no longer resolve, so nothing of ours ever sees the request.
   * They need a DNS record plus a redirect rule at Cloudflare.
   */
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.beaconarabia.com" }],
        destination: "https://beaconarabia.com/:path*",
        permanent: true,
      },

      // Global site.
      { source: "/pages/About", destination: "/about", permanent: true },
      { source: "/pages/Services", destination: "/services", permanent: true },
      { source: "/pages/Contact", destination: "/contact", permanent: true },
      { source: "/pages/Careers", destination: "/careers", permanent: true },
      { source: "/pages/Partners", destination: "/partners", permanent: true },
      { source: "/pages/blog", destination: "/blog", permanent: true },

      // The two regional landing pages, which only ever existed on their own
      // regional site and now live under a region segment.
      { source: "/pages/WhyDubai", destination: "/ae/why-dubai", permanent: true },
      { source: "/pages/WhySaudi", destination: "/sa/why-saudi", permanent: true },

      // Anything else under the old scheme is better sent to the homepage than
      // left as a 404 — a soft landing keeps the visitor and passes some equity.
      { source: "/pages/:path*", destination: "/", permanent: true },

      // Legal-page aliases. External audits probed /privacy, /terms-of-service
      // and /cookie-policy — the names people and tools guess — so each lands
      // on the real page rather than a 404. Cookie policy content lives inside
      // the privacy policy, as is proportionate for a site whose only cookies
      // are analytics.
      { source: "/privacy", destination: "/privacy-policy", permanent: true },
      { source: "/terms-of-service", destination: "/terms", permanent: true },
      { source: "/cookie-policy", destination: "/privacy-policy", permanent: true },
    ];
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      /**
       * Design assets in public/ — logos, hero art, icons, the ebook PDF.
       *
       * Next content-hashes everything it builds and caches that immutably,
       * but files served straight out of public/ keep their original names, so
       * an immutable long cache would pin a stale copy in every browser and CDN
       * with no way to bust it short of renaming the file. An hour with
       * must-revalidate keeps them cached without that trap.
       */
      {
        source: "/:path*.(svg|png|jpg|jpeg|webp|gif|ico|pdf|woff|woff2)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, must-revalidate" },
        ],
      },
    ];
  },
  images: {
    /**
     * Image optimization is off, and this is the single most important line in
     * this file for keeping the site up.
     *
     * Every `<Image>` without `unoptimized` becomes a `/_next/image` request
     * that runs sharp/libvips in the server process, each with its own thread
     * pool. The homepage alone issued 42 of them, so one visitor meant 42
     * concurrent optimizations. On this shared host that exhausted the account's
     * thread limit — `pthread_create: Resource temporarily unavailable`,
     * `fork: retry` even in an SSH shell — and took both apps down repeatedly.
     * The hosting team independently identified this app as the source.
     *
     * Almost nothing is given up, because the images are already optimized at
     * rest: the CMS media pipeline (cms/src/optimise-media.ts) re-encodes
     * anything over 250 KB to WebP at a maximum of 1600px, so the optimizer was
     * mostly re-processing WebP files into WebP. What is lost is per-breakpoint
     * resizing, which costs some bytes on small screens — a fair trade against
     * an outage, and recoverable later via Cloudflare's own image resizing,
     * which runs at the edge rather than in this process.
     *
     * `remotePatterns` below is now unused but kept: it costs nothing and is
     * required the moment this is turned back on.
     */
    unoptimized: true,

    // The legacy components all pass quality={100}; Next 16 requires each
    // quality value used to be declared here.
    qualities: [75, 100],
    /**
     * Derived from STRAPI_URL rather than hardcoded, so the deployed Strapi host
     * is allowed automatically. With only localhost listed, every CMS image
     * would 400 in production the moment anything stopped passing
     * `unoptimized` — which is now the case for section and blog-cover images.
     *
     * Deliberately the *public* CMS origin, not STRAPI_INTERNAL_URL: this is the
     * allowlist for URLs the browser will request, and a loopback address here
     * would be both useless to the client and rejected by the optimizer.
     *
     * `||` rather than `??` because a host that writes an empty string for an
     * unset env var would otherwise reach `new URL("")`, which throws
     * ERR_INVALID_URL while the config is loading — before the app can start or
     * report anything more helpful than a stack trace.
     */
    remotePatterns: [
      (() => {
        const url = new URL(process.env.STRAPI_URL || "http://localhost:1337");
        return {
          protocol: url.protocol.replace(":", "") as "http" | "https",
          hostname: url.hostname,
          ...(url.port ? { port: url.port } : {}),
          pathname: "/uploads/**",
        };
      })(),
    ],
    /**
     * Next 16 refuses to optimize an upstream image whose host resolves to a
     * private IP — an SSRF guard. Our dev Strapi is on localhost:1337, so every
     * CMS image 400s with "url parameter is not allowed" until this is set; the
     * real reason only appears in the server log ("resolved to private ip").
     *
     * Development only. In production Strapi is on a public host, and leaving
     * this on would let anyone use the optimizer to probe the internal network.
     */
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
  },
};

export default nextConfig;
