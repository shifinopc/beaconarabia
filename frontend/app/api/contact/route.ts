import { NextResponse } from "next/server";
import { verifyTurnstile } from "@/lib/turnstile";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { enquirySchema, regionKey } from "@/lib/enquiry-schema";
import { STRAPI_URL } from "@/lib/strapi";

/**
 * Single endpoint behind all three forms — contact, newsletter and the
 * first-visit popup — since they differ only in which fields they carry and all
 * end up in the same inbox.
 *
 * The submission is written to Strapi as an Enquiry; Strapi's afterCreate hook
 * sends the notification and the acknowledgement over SMTP. That ordering is
 * the point: the record is committed first, so a mail outage costs a
 * notification rather than the enquiry itself. Previously this called EmailJS
 * from here, which meant an enquiry existed only if a third-party service
 * happened to deliver it, with no record either way.
 *
 * Four layers before anything is stored, cheapest first:
 *   1. schema validation - rejects malformed input outright
 *   2. honeypot          - a field real users never see
 *   3. rate limit        - per IP, so a script cannot grind through
 *   4. Turnstile         - proves a human, when configured
 *
 * Never runs at build time.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = enquirySchema.safeParse(raw);
  if (!parsed.success) {
    // Surface the first message: these are user-facing field problems ("Please
    // provide a valid email address"), not internal detail.
    const message = parsed.error.issues[0]?.message ?? "Please check the form and try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const body = parsed.data;

  // 1. Honeypot. Answer exactly as if it succeeded — telling a bot it was
  //    detected only helps whoever is tuning it.
  if (body.website) {
    console.warn("[contact] honeypot triggered; dropping submission");
    return NextResponse.json({ ok: true });
  }

  // 2. Rate limit per IP.
  const ip = clientIp(request);
  const limit = rateLimit(`contact:${ip}`);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many submissions. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  // 3. Turnstile, when switched on.
  if (!(await verifyTurnstile(body.turnstileToken, ip))) {
    return NextResponse.json(
      { error: "Could not verify that you're human. Please refresh and retry." },
      { status: 403 },
    );
  }

  /**
   * A token scoped to creating enquiries and nothing else, so the write path
   * cannot read content even if it leaked. Falls back to the read-only token
   * only so a not-yet-updated environment fails with Strapi's 403 rather than
   * silently dropping submissions.
   */
  const token = process.env.STRAPI_WRITE_TOKEN ?? process.env.STRAPI_API_TOKEN;
  if (!token) {
    console.error("[contact] STRAPI_WRITE_TOKEN is not set; cannot store enquiry");
    return NextResponse.json(
      { error: "The contact form isn't configured yet. Please email us directly." },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/enquiries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        data: {
          kind: body.kind,
          name: body.name,
          email: body.email,
          phone: body.phone,
          subject: body.subject,
          message: body.message,
          region: regionKey(body.region),
          enquiryType: body.enquiryType,
          sourcePath: body.sourcePath,
          ipAddress: ip,
        },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(
        `[contact] Strapi rejected the enquiry (${response.status}): ${detail.slice(0, 300)}`,
      );
      return NextResponse.json(
        { error: "Something went wrong sending your message. Please try again." },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error(
      `[contact] could not reach Strapi: ${error instanceof Error ? error.message : error}`,
    );
    return NextResponse.json(
      { error: "Something went wrong sending your message. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
