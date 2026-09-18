/**
 * Conversion events for GA4 (and Microsoft Clarity).
 *
 * Every form on the site posts in the background and never reloads the page,
 * so GA4's automatic form tracking only ever saw `form_start`: in its first
 * seven weeks the site took 53 enquiries while GA4 recorded no submissions at
 * all. These events close that gap. They are sent from code rather than set up
 * in Tag Manager because container GTM-KZ8GPMCB has never been published.
 *
 * Events use GA4's recommended names where one exists (`generate_lead`,
 * `sign_up`, `file_download`), so GA4's standard reports pick them up. No
 * personal data is sent: only the kind of form, the region and the page, never
 * a name, email, phone number or message.
 *
 * Calls go through `gtag`, queued on `window.dataLayer` exactly as Google's own
 * snippet does, so an event fired before gtag.js finishes loading is still
 * delivered. If GA4 is later served only through Tag Manager, these calls
 * still reach it through the same dataLayer.
 */

type EventParams = Record<string, string | number | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: string, params: EventParams = {}): void {
  if (typeof window === "undefined") return;
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
  );
  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", name, clean);
    } else {
      window.dataLayer = window.dataLayer || [];
      // gtag's own queue shape: an `arguments` object, not an array.
      const queue = function () {
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer!.push(arguments);
      } as (...args: unknown[]) => void;
      queue("event", name, clean);
    }
    // Lets Clarity recordings be filtered to sessions that converted.
    window.clarity?.("event", name);
  } catch {
    // Analytics must never break a form or a link.
  }
}

/** A successful form submission: a lead, or a newsletter sign-up. */
export function trackSubmission(kind: "contact" | "newsletter" | "popup", details: {
  region?: string;
  enquiryType?: string;
  subject?: string;
}): void {
  const page_path = typeof window === "undefined" ? undefined : window.location.pathname;
  if (kind === "newsletter") {
    trackEvent("sign_up", { method: "newsletter", form_region: details.region, page_path });
    return;
  }
  trackEvent("generate_lead", {
    form_kind: kind,
    form_region: details.region,
    enquiry_type: details.enquiryType,
    // The popup's heading names the offer (call back, ebook, partner); the
    // contact form has none.
    form_subject: kind === "popup" ? details.subject : undefined,
    page_path,
  });
}
