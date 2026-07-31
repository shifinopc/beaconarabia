import type { Metadata } from "next";
import ServicesPage from "@/components/pages/ServicesPage";
import { REGIONS, alternatesFor } from "@/lib/regions";

export const metadata: Metadata = {
  title: "Services",
  description: "Business incorporation, consultation, accounting, audit and technology services.",
  alternates: alternatesFor(REGIONS.global, "services"),
};

export default function Page() {
  return <ServicesPage region={REGIONS.global} />;
}
