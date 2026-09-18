"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics-events";

/**
 * Records clicks on phone, email and WhatsApp links as `contact_click`.
 *
 * GA4's automatic outbound-click tracking already sees wa.me links, but only
 * as a generic `click`, and it never sees `tel:` or `mailto:` links at all
 * because they do not point at another website. For a consultancy these are
 * enquiries in their own right, so they get one clearly named event with a
 * `method` of phone, email or whatsapp.
 *
 * One capture-phase listener on the document covers every link, including the
 * footer, the office pages and the floating WhatsApp button, without touching
 * each component. The link itself behaves exactly as before.
 */
export default function ContactClickTracking() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const link = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link) return;
      const href = link.getAttribute("href") ?? "";
      let method: string | undefined;
      if (href.startsWith("tel:")) method = "phone";
      else if (href.startsWith("mailto:")) method = "email";
      else if (/^https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//i.test(href)) method = "whatsapp";
      if (!method) return;
      trackEvent("contact_click", { method, page_path: window.location.pathname });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
