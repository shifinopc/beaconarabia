import { NextResponse, type NextRequest } from "next/server";
import { REGION_COOKIE, COUNTRY_TO_SEGMENT } from "@/lib/regions";

/**
 * Sends first-time visitors to the regional site for their country: UAE -> /ae,
 * Saudi Arabia -> /sa, everywhere else stays on the global site.
 *
 * Named `proxy.ts` rather than `middleware.ts` — Next 16 renamed the convention
 * (the functionality is unchanged).
 *
 * Country comes from Cloudflare's `CF-IPCountry` request header, which the edge
 * adds to every proxied request. It requires IP Geolocation to be enabled under
 * Cloudflare -> Network; without it the header is absent, `segment` is
 * undefined, and every visitor simply gets the global site — the feature fails
 * off rather than misrouting people.
 *
 * Three deliberate constraints, because geo-redirects are easy to get wrong:
 *
 *  - Only `/` is matched. A visitor who followed a link or a search result to
 *    /services or /sa/about asked for that page specifically, and moving them
 *    somewhere else would be hostile. Only the bare homepage is ambiguous
 *    enough to be worth guessing about.
 *
 *  - Crawlers are never redirected. Googlebot crawls predominantly from US
 *    addresses; if it were bounced around by IP it would struggle to index the
 *    regional trees, and the hreflang annotations in lib/regions.ts — which are
 *    what actually tell Google these are regional variants — would be fighting
 *    the redirect rather than complementing it.
 *
 *  - The choice is remembered and overridable. Once redirected, a cookie stops
 *    it happening again, so the "Explore -> Global" link genuinely reaches the
 *    global site instead of bouncing back. `?region=` sets that cookie
 *    explicitly for visitors who never hit `/` in the first place.
 */

/** A year: this is a preference, not a session. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Matches the user agents that must be served the URL they asked for. Search
 * crawlers are the important ones; link-preview fetchers (WhatsApp, Slack,
 * Telegram) matter too, since a redirect makes them render the wrong region's
 * card for a shared link.
 */
const CRAWLER =
  /bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|slackbot|discordbot|embedly|quora link preview|redditbot|applebot|lighthouse|pagespeed|gtmetrix|pingdom|w3c_validator/i;

function cookieOptions() {
  return {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export function proxy(request: NextRequest) {
  // An explicit choice always wins over geography.
  const chosen = request.nextUrl.searchParams.get("region");
  if (chosen) {
    const clean = request.nextUrl.clone();
    clean.searchParams.delete("region");
    const response = NextResponse.redirect(clean, 307);
    response.cookies.set(REGION_COOKIE, chosen, cookieOptions());
    // Never let a CDN hand this redirect to the next visitor.
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  // Already routed once, or chose deliberately: leave them alone.
  if (request.cookies.has(REGION_COOKIE)) return NextResponse.next();

  if (CRAWLER.test(request.headers.get("user-agent") ?? "")) {
    return NextResponse.next();
  }

  const country = (request.headers.get("cf-ipcountry") ?? "").toUpperCase();
  const segment = COUNTRY_TO_SEGMENT[country];

  // Unknown country, or one without its own site (Cloudflare sends XX when it
  // can't place an address and T1 for Tor): the global site is already correct.
  if (!segment) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${segment}`;
  const response = NextResponse.redirect(url, 307);
  response.cookies.set(REGION_COOKIE, segment, cookieOptions());
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: "/",
};
