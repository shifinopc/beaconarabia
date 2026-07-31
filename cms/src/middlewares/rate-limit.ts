/**
 * Per-IP sliding-window rate limiter.
 *
 * Registered globally in config/middlewares.ts, but deliberately narrow about
 * what it counts, because of how this deployment is shaped:
 *
 * Every legitimate content read reaches Strapi from the *Next.js server*, not
 * from a browser — pages are server-rendered or statically generated, so the
 * whole site's traffic arrives from a single IP holding a single API token. A
 * naive per-IP limit would therefore throttle the entire website while doing
 * nothing about an actual attacker, and would break `next build`, which fires
 * roughly 180 requests in a few seconds while generating 30 pages.
 *
 * So authenticated requests are exempt and anonymous ones are limited. That
 * matches the trust boundary: the token holder is our own server, and anonymous
 * callers have no read access anyway (see ensurePublicReadAccess), meaning the
 * only thing they can do at volume is probe. A forged Authorization header
 * skips the limiter but still gets nothing except 401s, which is why login
 * endpoints get their own much stricter bucket below — brute-forcing the admin
 * password is the attack actually worth slowing down.
 *
 * In-memory, so limits are per Strapi process. Fine for this single-instance
 * deployment; a multi-node setup would need a shared store (Redis) or an edge
 * rate limiter in front.
 */

interface Config {
  /** Anonymous requests allowed per window, per IP. */
  max?: number;
  windowMs?: number;
  /** Requests allowed per window for authentication endpoints. */
  authMax?: number;
  authWindowMs?: number;
}

/** Paths where a failed attempt is a guess at a credential. */
const AUTH_PATHS = [
  '/admin/login',
  '/admin/auth/',
  '/admin/register',
  '/admin/forgot-password',
  '/admin/reset-password',
  '/api/auth/',
];

type Hits = Map<string, number[]>;

const store: Hits = new Map();

/** Keeps the map from growing without bound under sustained traffic. */
function sweep(cutoff: number) {
  if (store.size <= 5000) return;
  for (const [key, times] of store.entries()) {
    const fresh = times.filter((t) => t > cutoff);
    if (fresh.length) store.set(key, fresh);
    else store.delete(key);
  }
}

export default (config: Config | null) => {
  const max = config?.max ?? 120;
  const windowMs = config?.windowMs ?? 60_000;
  const authMax = config?.authMax ?? 10;
  const authWindowMs = config?.authWindowMs ?? 300_000;

  return async (ctx: any, next: () => Promise<unknown>) => {
    const path: string = ctx.request?.path ?? '';
    const isAuthEndpoint = AUTH_PATHS.some((p) => path.startsWith(p));

    // Our own server, authenticated with the read-only token: never throttled.
    if (!isAuthEndpoint) {
      if (ctx.request?.header?.authorization) return next();
      if (!path.startsWith('/api/')) return next();
    }

    /**
     * `ctx.request.ip` is only trustworthy when Strapi is told it sits behind a
     * proxy (IS_PROXIED / config/server.ts), which sets koa's `proxy` flag so
     * X-Forwarded-For is parsed. Falling back to the raw header covers the case
     * where it isn't, at the cost of being spoofable — acceptable, since the
     * consequence is an attacker rate-limiting themselves less effectively
     * rather than gaining access.
     */
    const forwarded = ctx.request?.header?.['x-forwarded-for'];
    const ip =
      ctx.request?.ip ||
      (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined) ||
      'unknown';

    const limit = isAuthEndpoint ? authMax : max;
    const window = isAuthEndpoint ? authWindowMs : windowMs;
    const key = `${isAuthEndpoint ? 'auth' : 'api'}:${ip}`;

    const now = Date.now();
    const cutoff = now - window;
    const hits = (store.get(key) ?? []).filter((t) => t > cutoff);

    if (hits.length >= limit) {
      const retryAfter = Math.max(Math.ceil((hits[0]! + window - now) / 1000), 1);
      ctx.set('Retry-After', String(retryAfter));
      ctx.status = 429;
      ctx.body = {
        data: null,
        error: {
          status: 429,
          name: 'TooManyRequests',
          message: 'Too many requests. Please try again shortly.',
        },
      };
      return;
    }

    hits.push(now);
    store.set(key, hits);
    sweep(cutoff);

    await next();
  };
};
