import type { Metadata } from "next";
import ServicesPage from "@/components/pages/ServicesPage";
import { REGIONS } from "@/lib/regions";
import { globalPageMetadata } from "@/lib/page-metadata";

/**
 * Title and description come from this page's CMS entry when set, so they can
 * be changed without a deploy; the values below are the fallback.
 */
export function generateMetadata(): Promise<Metadata> {
  return globalPageMetadata({
    slug: "services",
    title: "Business Setup & Advisory Services in the GCC",
    description: "Company incorporation, business consulting, accounting, audit and taxation, technology and digital marketing services for businesses across the UAE and Saudi Arabia.",
  });
}

export default function Page() {
  return <ServicesPage region={REGIONS.global} />;
}
