import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ServiceDetailPage from "@/components/pages/ServiceDetailPage";
import { REGIONS, alternatesFor, isRegionSegment, regionUrl } from "@/lib/regions";
import { getAllServices, getServiceBySlug } from "@/lib/strapi";

type Params = { region: string; slug: string };

/**
 * Prerenders every regional service.
 *
 * Same reasoning as the blog routes: rendering these per request needs the
 * server to reach the CMS mid-response, which hangs on this deployment. Each
 * service belongs to one region, so the pairing comes from the service's own
 * `region` rather than a cross product of regions and slugs.
 */
export async function generateStaticParams(): Promise<Params[]> {
  try {
    const services = await getAllServices();
    return services
      .filter((s) => s.slug && s.region !== "global")
      .map((s) => ({ region: s.region, slug: s.slug }));
  } catch {
    // A CMS outage during the build must not take the whole build down.
    return [];
  }
}

/** Unknown region/slug pairs 404 rather than being rendered on demand. */
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { region: segment, slug } = await params;
  if (!isRegionSegment(segment)) return {};
  const region = REGIONS[segment];
  const service = await getServiceBySlug(region.strapiValue, slug);
  if (!service) return {};

  const description =
    service.summary?.trim() ||
    `${service.title} in ${region.label}. Talk to Beacon about scope, timelines and cost.`;

  return {
    title: `${service.title} in ${region.label}`,
    description: description.slice(0, 155),
    alternates: {
      ...alternatesFor(region, `services/${slug}`),
      canonical: `${regionUrl(region)}/services/${slug}`,
    },
    openGraph: {
      title: `${service.title} in ${region.label}`,
      description: description.slice(0, 200),
      url: `${regionUrl(region)}/services/${slug}`,
      type: "article",
    },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { region: segment, slug } = await params;
  if (!isRegionSegment(segment)) notFound();

  return <ServiceDetailPage region={REGIONS[segment]} slug={slug} />;
}
