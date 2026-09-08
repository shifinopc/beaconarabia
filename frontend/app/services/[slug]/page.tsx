import type { Metadata } from "next";
import ServiceDetailPage from "@/components/pages/ServiceDetailPage";
import { REGIONS, alternatesFor, regionUrl } from "@/lib/regions";
import { getAllServices, getServiceBySlug } from "@/lib/strapi";

type Params = { slug: string };

/** Prerenders the global services — the regional ones live under /<region>/. */
export async function generateStaticParams(): Promise<Params[]> {
  try {
    const services = await getAllServices();
    return services
      .filter((s) => s.slug && s.region === "global")
      .map((s) => ({ slug: s.slug }));
  } catch {
    return [];
  }
}

/**
 * A service added in the CMS renders without waiting for a deploy.
 *
 * Same reason as the blog routes: with `false`, anything published after
 * the last build 404s while the services page links straight to it.
 * ServiceDetailPage calls notFound() when the slug matches nothing, so an
 * invented URL still 404s.
 */
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = await getServiceBySlug("global", slug);
  if (!service) return {};

  const description =
    service.summary?.trim() ||
    `${service.title}. Talk to Beacon about scope, timelines and cost.`;

  return {
    title: service.title,
    description: description.slice(0, 155),
    alternates: {
      ...alternatesFor(REGIONS.global, `services/${slug}`),
      canonical: `${regionUrl(REGIONS.global)}/services/${slug}`,
    },
    openGraph: {
      title: service.title,
      description: description.slice(0, 200),
      url: `${regionUrl(REGIONS.global)}/services/${slug}`,
      type: "article",
    },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  return <ServiceDetailPage region={REGIONS.global} slug={slug} />;
}
