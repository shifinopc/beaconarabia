import { NextResponse } from "next/server";
import { sendEmail, isEmailConfigured } from "@/lib/emailjs";
import { verifyTurnstile } from "@/lib/turnstile";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Single endpoint behind all three forms — contact, newsletter and the
 * first-visit popup — since they differ only in which fields they carry and
 * all end up in the same inbox.
 *
 * Three layers, cheapest first:
 *   1. honeypot   - a field real users never see; costs nothing, catches the
 *                   naive scripted submitters that make up most form spam
 *   2. rate limit  - per IP, so a determined script cannot grind through
 *   3. Turnstile   - proves a human, when configured
 *
 * Never runs at build time.
 */
export const dynamic = "force-dynamic";

/** Caps on what we accept, so an oversized body can't be relayed into email. */
const LIMITS: Record<string, number> = {
  name: 200,
  email: 320,
  phone: 60,
  subject: 300,
  message: 5000,
  enquiryType: 100,
  region: 100,
};

interface Payload {
  kind?: string;
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  region?: string;
  enquiryType?: string;
  /** Honeypot. Named to look worth filling in to a bot parsing the DOM. */
  website?: string;
  turnstileToken?: string;
}

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  // Strip control characters: they have no place in an email field and are how
  // header-injection attempts are smuggled in.
  return value.replace(/[\x00-\x1F\x7F]/g, " ").trim().slice(0, max);
}

export async function POST(request: Request) {
  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // 1. Honeypot. Respond exactly as if it succeeded — telling a bot it was
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

  const email = clean(body.email, LIMITS.email);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Please provide a valid email address." },
      { status: 400 },
    );
  }

  if (!isEmailConfigured()) {
    console.error("[contact] EmailJS is not configured; submission dropped");
    return NextResponse.json(
      { error: "The contact form isn't configured yet. Please email us directly." },
      { status: 503 },
    );
  }

  const result = await sendEmail({
    kind: clean(body.kind, 40) || "contact",
    name: clean(body.name, LIMITS.name),
    email,
    phone: clean(body.phone, LIMITS.phone),
    subject: clean(body.subject, LIMITS.subject),
    message: clean(body.message, LIMITS.message),
    region: clean(body.region, LIMITS.region),
    enquiryType: clean(body.enquiryType, LIMITS.enquiryType),
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: "Something went wrong sending your message. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
