import type { Metadata } from "next";
import ContactPage from "@/components/pages/ContactPage";
import { REGIONS, alternatesFor } from "@/lib/regions";

export const metadata: Metadata = {
  title: "Contact Beacon — Offices in the UAE & Saudi Arabia",
  description:
    "Speak to Beacon about setting up or growing your business in the GCC. Offices in Dubai, Riyadh, Jeddah, Dammam and Jazan — call, email or send us a message.",
  alternates: alternatesFor(REGIONS.global, "contact"),
};

export default function Page() {
  return <ContactPage region={REGIONS.global} />;
}
