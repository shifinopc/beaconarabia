import type { Metadata } from "next";
import CareersPage from "@/components/pages/CareersPage";
import { REGIONS, alternatesFor } from "@/lib/regions";

export const metadata: Metadata = {
  title: "Careers at Beacon — Join Our GCC Team",
  description:
    "Build your career with Beacon across the UAE and Saudi Arabia. See open roles in business advisory, accounting, consulting and client services, and apply today.",
  alternates: alternatesFor(REGIONS.global, "careers"),
};

export default function Page() {
  return <CareersPage region={REGIONS.global} />;
}
