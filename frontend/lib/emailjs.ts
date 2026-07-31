/**
 * Server-side EmailJS delivery.
 *
 * The three forms previously called `@emailjs/browser` directly, which meant
 * the service id, template id and public key all shipped in the client bundle.
 * Anyone could read them out of the JavaScript and send mail through the
 * account's quota from anywhere — the only thing standing in the way was the
 * allowed-origins list on EmailJS's own dashboard, which is trivially spoofed
 * outside a browser (an Origin header is just a string to curl).
 *
 * Sending from the server instead keeps every credential out of the bundle and
 * puts the honeypot, Turnstile check and rate limiter in front of the send.
 *
 * EmailJS blocks non-browser calls unless the request carries the account's
 * private key as `accessToken` — so EMAILJS_PRIVATE_KEY is required for this
 * path. Find it under Account -> General -> Private Key (enable "API requests
 * from non-browser applications" in the same screen).
 *
 * The NEXT_PUBLIC_* names are still read as a fallback so an environment
 * configured before this change keeps working; new deployments should use the
 * unprefixed names, which are the ones that stay server-side.
 */

const ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send";

interface EmailJsConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
  privateKey: string;
}

function readConfig(): EmailJsConfig | null {
  const serviceId =
    process.env.EMAILJS_SERVICE_ID ?? process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID ?? "";
  const templateId =
    process.env.EMAILJS_TEMPLATE_ID ?? process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID ?? "";
  const publicKey =
    process.env.EMAILJS_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY ?? "";
  const privateKey = process.env.EMAILJS_PRIVATE_KEY ?? "";

  if (!serviceId || !templateId || !publicKey || !privateKey) return null;
  return { serviceId, templateId, publicKey, privateKey };
}

export function isEmailConfigured(): boolean {
  return readConfig() !== null;
}

export type SendResult =
  | { ok: true }
  | { ok: false; reason: "unconfigured" | "rejected" };

export async function sendEmail(
  params: Record<string, string>,
): Promise<SendResult> {
  const config = readConfig();
  if (!config) return { ok: false, reason: "unconfigured" };

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: config.serviceId,
        template_id: config.templateId,
        user_id: config.publicKey,
        accessToken: config.privateKey,
        template_params: params,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      // EmailJS returns the reason as plain text; log it server-side so a
      // misconfiguration is diagnosable without exposing it to the caller.
      const detail = await res.text().catch(() => "");
      console.error(`[emailjs] send failed (${res.status}): ${detail.slice(0, 200)}`);
      return { ok: false, reason: "rejected" };
    }

    return { ok: true };
  } catch (error) {
    console.error(
      `[emailjs] send threw: ${error instanceof Error ? error.message : error}`,
    );
    return { ok: false, reason: "rejected" };
  }
}
