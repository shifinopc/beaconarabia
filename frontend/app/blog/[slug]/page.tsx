import type { Metadata } from "next";
import BlogPostPage from "@/components/pages/BlogPostPage";
import { REGIONS } from "@/lib/regions";
import { articleMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return articleMetadata(REGIONS.global.strapiValue, slug);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BlogPostPage region={REGIONS.global} slug={slug} />;
}
