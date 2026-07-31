import type { Metadata } from "next";
import PartnersPage from "@/components/pages/PartnersPage";
import { REGIONS, alternatesFor } from "@/lib/regions";

export const metadata: Metadata = {
  title: "Partners",
  description: "Partner with Beacon and grow your business across the GCC.",
  alternates: alternatesFor(REGIONS.global, "partners"),
};

export default function Page() {
  return <PartnersPage region={REGIONS.global} />;
}
