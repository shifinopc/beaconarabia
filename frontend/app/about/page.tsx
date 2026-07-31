import type { Metadata } from "next";
import AboutPage from "@/components/pages/AboutPage";
import { REGIONS, alternatesFor } from "@/lib/regions";

export const metadata: Metadata = {
  title: "About Us",
  description: "About Beacon — your global advisory partner.",
  alternates: alternatesFor(REGIONS.global, "about"),
};

export default function Page() {
  return <AboutPage region={REGIONS.global} />;
}
