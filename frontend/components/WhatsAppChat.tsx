import { loadSiteInfo } from "@/lib/site";

/**
 * Floating WhatsApp button.
 *
 * Ported from bg-Beacon/src/app/components/WhatsAppChat.js. Uses the design's
 * own `.chat-icon` class, which supplies the fixed positioning and the
 * `whatssAppIcon` pulse animation — the earlier version of this component
 * invented a class name and inlined positioning, so it got neither.
 *
 * The legacy component was a client component holding hover state for an
 * office-card popover; that popover was not rendered on the homepage, so this
 * stays a server component and ships no JS.
 */
export default async function WhatsAppChat() {
  const SITE = await loadSiteInfo();
  return (
    <a
      href={SITE.whatsapp}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="chat-icon"
    >
      <img src="/whatsapp.svg" alt="" />
    </a>
  );
}
