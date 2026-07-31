import type { Metadata } from "next";
import ContactPage from "@/components/pages/ContactPage";
import { REGIONS, alternatesFor } from "@/lib/regions";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with the Beacon team.",
  alternates: alternatesFor(REGIONS.global, "contact"),
};

export default function Page() {
  return <ContactPage region={REGIONS.global} />;
}
