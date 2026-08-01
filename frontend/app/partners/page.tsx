import type { Metadata } from "next";
import PartnersPage from "@/components/pages/PartnersPage";
import { REGIONS, alternatesFor } from "@/lib/regions";

export const metadata: Metadata = {
  title: "Partner With Beacon — Grow Across the GCC",
  description:
    "Partner with Beacon to serve clients across the UAE and Saudi Arabia. Referral and collaboration opportunities for advisors, agencies and professional firms.",
  alternates: alternatesFor(REGIONS.global, "partners"),
};

export default function Page() {
  return <PartnersPage region={REGIONS.global} />;
}
