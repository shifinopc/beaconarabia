import type { Metadata } from "next";
import ServicesPage from "@/components/pages/ServicesPage";
import { REGIONS, alternatesFor } from "@/lib/regions";

export const metadata: Metadata = {
  title: "Business Setup & Advisory Services in the GCC",
  description:
    "Company incorporation, business consulting, accounting, audit and taxation, technology and digital marketing services for businesses across the UAE and Saudi Arabia.",
  alternates: alternatesFor(REGIONS.global, "services"),
};

export default function Page() {
  return <ServicesPage region={REGIONS.global} />;
}
