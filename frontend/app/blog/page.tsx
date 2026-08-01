import type { Metadata } from "next";
import BlogListPage from "@/components/pages/BlogListPage";
import { REGIONS, alternatesFor } from "@/lib/regions";

export const metadata: Metadata = {
  title: "Business Insights for the UAE & Saudi Arabia",
  description:
    "Guides and analysis on company formation, licensing, tax and regulation across the GCC — practical insight for founders and businesses entering the region.",
  alternates: alternatesFor(REGIONS.global, "blog"),
};

export default function Page() {
  return <BlogListPage region={REGIONS.global} />;
}
