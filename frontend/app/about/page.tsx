import type { Metadata } from "next";
import AboutPage from "@/components/pages/AboutPage";
import { REGIONS, alternatesFor } from "@/lib/regions";

export const metadata: Metadata = {
  title: "About Beacon — Business Advisors Across the GCC",
  description:
    "Beacon is a business advisory firm helping companies incorporate and grow across the UAE and Saudi Arabia, with offices in Dubai, Riyadh, Jeddah and Dammam.",
  alternates: alternatesFor(REGIONS.global, "about"),
};

export default function Page() {
  return <AboutPage region={REGIONS.global} />;
}
