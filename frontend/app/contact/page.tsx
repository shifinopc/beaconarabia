import type { Metadata } from "next";
import ContactPage from "@/components/pages/ContactPage";
import { REGIONS } from "@/lib/regions";
import { globalPageMetadata } from "@/lib/page-metadata";

/**
 * Title and description come from this page's CMS entry when set, so they can
 * be changed without a deploy; the values below are the fallback.
 */
export function generateMetadata(): Promise<Metadata> {
  return globalPageMetadata({
    slug: "contact",
    title: "Contact Beacon — Offices in the UAE & Saudi Arabia",
    description: "Speak to Beacon about setting up or growing your business in the GCC. Offices in Dubai, Riyadh, Jeddah, Dammam and Jazan — call, email or send us a message.",
  });
}

export default function Page() {
  return <ContactPage region={REGIONS.global} />;
}
