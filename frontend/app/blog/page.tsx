import type { Metadata } from "next";
import BlogListPage from "@/components/pages/BlogListPage";
import { REGIONS, alternatesFor } from "@/lib/regions";

export const metadata: Metadata = {
  title: "Blog",
  description: "Insights and updates from Beacon.",
  alternates: alternatesFor(REGIONS.global, "blog"),
};

export default function Page() {
  return <BlogListPage region={REGIONS.global} />;
}
