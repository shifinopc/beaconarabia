import type { Metadata } from "next";
import CareersPage from "@/components/pages/CareersPage";
import { REGIONS, alternatesFor } from "@/lib/regions";

export const metadata: Metadata = {
  title: "Careers",
  description: "Join the Beacon team across the GCC.",
  alternates: alternatesFor(REGIONS.global, "careers"),
};

export default function Page() {
  return <CareersPage region={REGIONS.global} />;
}
