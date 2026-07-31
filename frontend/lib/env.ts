/**
 * Startup environment check.
 *
 * Runs once when the server boots (called from app/layout.tsx). In production a
 * missing required variable throws and the process refuses to start; in
 * development it warns, so an empty .env.local doesn't block the dev loop.
 *
 * Failing loudly at boot is the whole point. Every one of these has a fallback
 * somewhere that looks harmless and isn't:
 *
 *  - NEXT_PUBLIC_SITE_URL backs metadataBase, every canonical, every hreflang
 *    alternate, the sitemap and robots.txt. Unset, it silently becomes
 *    http://localhost:3000 and the site serves localhost URLs to crawlers.
 *  - STRAPI_URL unset means requests go to localhost:1337, which in production
 *    is nothing at all — every page renders from hardcoded fallbacks and looks
 *    superficially fine while showing stale content.
 *  - STRAPI_API_TOKEN is required because public read access is off by design
 *    (see ensurePublicReadAccess in the CMS). Without it every content fetch
 *    403s and the site quietly falls back again.
 *
 * All three of these have actually bitten this deployment, which is why they
 * are hard failures rather than warnings.
 */

const REQUIRED_IN_PRODUCTION = [
  "NEXT_PUBLIC_SITE_URL",
  "STRAPI_URL",
  "STRAPI_API_TOKEN",
] as const;

/**
 * Missing these degrades a feature but leaves the site standing, so they warn
 * rather than throw — refusing to boot the whole site because the contact form
 * isn't wired up yet would be the wrong trade.
 */
const RECOMMENDED = [
  "REVALIDATE_SECRET",
  "EMAILJS_SERVICE_ID",
  "EMAILJS_TEMPLATE_ID",
  "EMAILJS_PUBLIC_KEY",
  "EMAILJS_PRIVATE_KEY",
] as const;

/** Old names still honoured, so a pre-rename environment isn't reported as broken. */
const ALIASES: Record<string, string[]> = {
  EMAILJS_SERVICE_ID: ["NEXT_PUBLIC_EMAILJS_SERVICE_ID"],
  EMAILJS_TEMPLATE_ID: ["NEXT_PUBLIC_EMAILJS_TEMPLATE_ID"],
  EMAILJS_PUBLIC_KEY: ["NEXT_PUBLIC_EMAILJS_PUBLIC_KEY"],
};

function isSet(name: string): boolean {
  if (process.env[name]) return true;
  return (ALIASES[name] ?? []).some((alias) => Boolean(process.env[alias]));
}

let done = false;

export function validateEnv(): void {
  if (done) return;
  done = true;

  const missing = REQUIRED_IN_PRODUCTION.filter((name) => !isSet(name));
  const missingRecommended = RECOMMENDED.filter((name) => !isSet(name));

  /**
   * `next build` sets NODE_ENV=production, so without this check a local
   * production build would abort merely because the developer's .env.local
   * points at localhost — which is correct for local work.
   *
   * Warning rather than throwing here loses nothing: the same check runs again
   * when the server boots, so a genuinely misconfigured deployment still fails
   * loudly, at the point where it would actually serve bad URLs.
   */
  const isBuild = process.env.NEXT_PHASE === "phase-production-build";

  if (process.env.NODE_ENV !== "production" || isBuild) {
    if (missing.length) {
      console.warn(
        `[env] Missing (required at runtime): ${missing.join(", ")}. ` +
          `${isBuild ? "The build will continue" : "Development will continue"} using fallbacks.`,
      );
    }
    return;
  }

  /**
   * Warnings only — never throws.
   *
   * Enforcement lives in server.js, which runs before anything is served and
   * can exit(1). Throwing here cannot stop a misconfigured deployment: static
   * pages are served straight from disk without loading this module, so the
   * error is logged while the wrong pages keep serving. What it *can* do is
   * turn every dynamic page into a 500 — strictly worse than the problem.
   *
   * The two also read different data. NEXT_PUBLIC_* values are inlined into the
   * bundle at build time, so what this module sees is the build-time
   * configuration; server.js sees the runtime environment. Both are worth
   * reporting, and a mismatch between them (built with one site URL, started
   * with another) is itself a bug worth surfacing.
   */
  if (missing.length) {
    console.error(
      `[env] Missing required variables at build time: ${missing.join(", ")}. ` +
        "Pages built without them carry localhost URLs and fallback content — rebuild once they are set.",
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl && !/^https?:\/\//.test(siteUrl)) {
    console.error(
      `[env] NEXT_PUBLIC_SITE_URL should be an absolute URL including the scheme; got "${siteUrl}".`,
    );
  } else if (siteUrl?.includes("localhost")) {
    console.error(
      `[env] This build baked in NEXT_PUBLIC_SITE_URL="${siteUrl}". ` +
        "Every canonical, hreflang and sitemap entry it generated names that host. Rebuild with the public URL.",
    );
  }

  if (missingRecommended.length) {
    console.warn(
      `[env] Missing recommended variables: ${missingRecommended.join(", ")}. ` +
        "Affected features (revalidation webhook, contact forms) will be unavailable.",
    );
  }
}
