import type { Metadata } from "next";
import AboutPage from "@/components/pages/AboutPage";
import { REGIONS } from "@/lib/regions";
import { globalPageMetadata } from "@/lib/page-metadata";

/**
 * Title and description come from this page's CMS entry when set, so they can
 * be changed without a deploy; the values below are the fallback.
 */
export function generateMetadata(): Promise<Metadata> {
  return globalPageMetadata({
    slug: "about",
    title: "About Beacon — Business Advisors Across the GCC",
    description: "Beacon is a business advisory firm helping companies incorporate and grow across the UAE and Saudi Arabia, with offices in Dubai, Riyadh, Jeddah and Dammam.",
  });
}

export default function Page() {
  return <AboutPage region={REGIONS.global} />;
}
