/**
 * Cloudflare Turnstile — a CAPTCHA alternative that is usually invisible to
 * real users but forces an automated submitter to solve a challenge.
 *
 * Configured entirely by environment:
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY  - public, rendered into the widget
 *   TURNSTILE_SECRET_KEY            - server only, never sent to the browser
 *
 * If either is missing, verification is skipped and the forms keep working.
 * That is deliberate: a misconfigured anti-bot measure should not take the
 * contact form down with it, and the honeypot plus rate limiting still apply.
 * The trade-off is that forgetting to set these leaves only the weaker
 * defences, so `isTurnstileConfigured` is logged once at startup.
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function turnstileSiteKey(): string {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
}

export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY && turnstileSiteKey());
}

/**
 * Returns true when the submission may proceed.
 *
 * Note the asymmetry: an unconfigured Turnstile returns true (feature off),
 * but a *configured* Turnstile with a missing or invalid token returns false.
 * Once it is switched on it is enforced, rather than degrading open the moment
 * a bot omits the field — which would make it worthless.
 */
export async function verifyTurnstile(
  token: string | undefined,
  remoteIp?: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !turnstileSiteKey()) return true;

  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);

    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      // Never let a slow challenge server hang a form submission.
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    // Network failure or timeout reaching Cloudflare. Fail closed: if the
    // check cannot be performed we do not know the caller is human.
    return false;
  }
}
