import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogPostPage from "@/components/pages/BlogPostPage";
import { REGIONS, isRegionSegment } from "@/lib/regions";
import { articleMetadata } from "@/lib/seo";

type Params = { region: string; slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { region: segment, slug } = await params;
  if (!isRegionSegment(segment)) return {};
  return articleMetadata(REGIONS[segment].strapiValue, slug);
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { region: segment, slug } = await params;
  if (!isRegionSegment(segment)) notFound();

  return <BlogPostPage region={REGIONS[segment]} slug={slug} />;
}
