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
const securityHeaders = [
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
  // Drops the `X-Powered-By: Next.js` header — a free version fingerprint that
  // tells an attacker which framework CVEs to try.
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
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
