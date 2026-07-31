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

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
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
