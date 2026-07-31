import Image from "next/image";
import Link from "next/link";
import type { Region } from "@/lib/regions";
import { getServices, mediaUrl } from "@/lib/strapi";
import ExploreButton from "./ExploreButton";

/**
 * Services section.
 *
 * Ported from bg-Beacon/src/app/components/Services.jsx with the markup and
 * CSS class names unchanged, so the design renders identically. The difference:
 * the old component carried a hardcoded `servicesData` array in the file — that
 * now comes from Strapi, filtered by region, so the same component serves
 * global / AE / SA with different content.
 */
export default async function Services({
  region,
  heading,
}: {
  region: Region;
  /**
   * Region-specific eyebrow and title, from the `home-services` Section.
   * Saudi runs "Expertise / Navigate Your Business Journey in Saudi Arabia"
   * here, as its own site did; without one the shared wording is used.
   */
  heading?: { eyebrow?: string | null; title: string };
}) {
  const services = await getServices(region.strapiValue);

  if (!services.length) return null;

  const servicesHref = region.segment ? `/${region.segment}/services` : "/services";
  const eyebrow = heading?.eyebrow ?? "Services";
  const title = heading?.title ?? "Explore what our experts offer";

  return (
    <div className="serviceContainer">
      <div className="businessContentContainer">
        <p className="businessHeading">{eyebrow}</p>
        <h2 className="businessDesc">{title}</h2>
        {/* The mobile heading is a separate element in the legacy CSS, which
            hides one and shows the other rather than reflowing. */}
        <h2 className="mBusinessDesc">{title}</h2>
      </div>

      <div className="cardMainContainer">
        {services.map((service) => {
          const icon = mediaUrl(service.icon);
          return (
            <div className="cardContainer" key={service.documentId}>
              <div className="imgContainer">
                {icon && (
                  <Image
                    src={icon}
                    width={70}
                    height={70}
                    alt={service.icon?.alternativeText ?? service.title}
                    quality={100}
                    unoptimized
                  />
                )}
              </div>
              <div className="servicesHeadingContainer">
                <h3 className="servicesHeading">{service.title}</h3>
              </div>
              <div className="servicesDescContainer">
                <p className="servicesDesc">{service.summary}</p>
              </div>
            </div>
          );
        })}
      </div>

      <Link href={servicesHref}>
        <ExploreButton label="Explore More" className="servicesButton" />
      </Link>
    </div>
  );
}
