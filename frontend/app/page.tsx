import type { Metadata } from "next";
import RegionHome from "@/components/RegionHome";
import { REGIONS, alternatesFor } from "@/lib/regions";

/**
 * Global site — served at the domain root.
 *
 * This is a static route, so Next resolves it ahead of the sibling [region]
 * dynamic segment. That is what lets /about belong to the global site while
 * /ae and /sa route to the regional pages.
 */
export const metadata: Metadata = {
  title: "Your Global Advisory Partner For Business Success",
  description:
    "Beacon provides business incorporation, consultation, accounting, audit and technology services across the GCC.",
  alternates: alternatesFor(REGIONS.global),
};

export default function GlobalHomePage() {
  return <RegionHome region={REGIONS.global} />;
}
