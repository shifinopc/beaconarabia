/**
 * Client-side helper for posting any of the three forms to /api/contact.
 *
 * Shared so the honeypot field name, the request shape and the error handling
 * stay identical across contact, newsletter and popup — a honeypot only works
 * if the server's expectations and the form's field name agree, and that is
 * exactly the kind of thing that drifts when it is written out three times.
 */

/**
 * The honeypot field's name. Attractive to a bot filling every input it finds,
 * and never filled by a real user because the field is hidden.
 */
export const HONEYPOT_FIELD = "website";

export interface SubmitPayload {
  kind: "contact" | "newsletter" | "popup";
  email: string;
  name?: string;
  phone?: string;
  subject?: string;
  message?: string;
  region?: string;
  enquiryType?: string;
  /** Value of the honeypot input; expected to be empty. */
  website?: string;
  turnstileToken?: string;
}

export interface SubmitResult {
  ok: boolean;
  /** Server-supplied message, safe to show the user. */
  error?: string;
}

export async function submitForm(payload: SubmitPayload): Promise<SubmitResult> {
  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) return { ok: true };

    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    return {
      ok: false,
      error: data?.error ?? "Something went wrong. Please try again.",
    };
  } catch {
    return {
      ok: false,
      error: "Couldn't reach the server. Please check your connection and retry.",
    };
  }
}

/**
 * Inline styles for the honeypot wrapper.
 *
 * `display: none` is avoided on purpose — the cruder bots skip hidden fields,
 * and a field they never fill traps nobody. This keeps it in the layout but
 * off-screen and out of the tab order and the accessibility tree.
 */
export const honeypotStyle: React.CSSProperties = {
  position: "absolute",
  left: "-9999px",
  width: 1,
  height: 1,
  overflow: "hidden",
};
