/**
 * In-memory per-IP sliding-window limiter for the form endpoints.
 *
 * Deliberately small: the forms are the only writable surface on this site, and
 * a submission is a human action, so a handful per minute is generous. This is
 * about stopping a script from emptying the EmailJS quota, not about precision.
 *
 * Per Node process, so limits reset on redeploy and are not shared across
 * instances. That is the right trade here — the alternative is a Redis
 * dependency for a site whose entire write surface is three contact forms.
 */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

const hits = new Map<string, number[]>();

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the caller may retry. Only meaningful when `ok` is false. */
  retryAfter: number;
}

export function rateLimit(
  key: string,
  max = MAX_PER_WINDOW,
  windowMs = WINDOW_MS,
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);

  if (recent.length >= max) {
    return {
      ok: false,
      retryAfter: Math.max(Math.ceil((recent[0]! + windowMs - now) / 1000), 1),
    };
  }

  recent.push(now);
  hits.set(key, recent);

  // Opportunistic sweep so the map stays bounded under sustained traffic.
  if (hits.size > 2000) {
    for (const [k, times] of hits.entries()) {
      const fresh = times.filter((t) => t > cutoff);
      if (fresh.length) hits.set(k, fresh);
      else hits.delete(k);
    }
  }

  return { ok: true, retryAfter: 0 };
}

/**
 * Best-effort client IP.
 *
 * Behind Cloudflare, `cf-connecting-ip` is the only header the edge guarantees
 * it sets itself and strips from client input, so it is preferred over
 * x-forwarded-for (which a caller can prepend to freely).
 */
export function clientIp(request: Request): string {
  const headers = request.headers;
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
