import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Region } from "@/lib/regions";
import { regionUrl } from "@/lib/regions";
import {
  getSections,
  getServiceBySlug,
  getServices,
  sectionByKey,
  servicePath,
} from "@/lib/strapi";
import {
  breadcrumbSchema,
  jsonLdProps,
  regionCrumbs,
} from "@/lib/structured-data";
import PageShell from "../PageShell";
import BlogContentBlock, { type ContentBlock } from "../BlogContentBlock";
import ContactCta from "../ContactCta";
import styles from "@/styles/blogList.module.css";

/**
 * Single service page.
 *
 * The services collection already carried `body` and `details` per entry, but
 * there was no route to show them: everything lived on one /services list, so
 * no service had an address of its own to rank.
 *
 * Layout deliberately reuses the article classes (dark hero band, then the
 * two-column body) rather than inventing new ones. An earlier version wrapped
 * everything in a `.container` class that does not exist in this codebase, so
 * the page rendered flush against the viewport edge with no padding at all.
 *
 * `body` renders through BlogContentBlock so services and articles share one
 * renderer, including its link parsing.
 */
export default async function ServiceDetailPage({
  region,
  slug,
}: {
  region: Region;
  slug: string;
}) {
  const [service, siblings, sections] = await Promise.all([
    getServiceBySlug(region.strapiValue, slug),
    getServices(region.strapiValue),
    getSections(region.strapiValue),
  ]);

  if (!service) notFound();

  const base = regionUrl(region);
  const others = siblings.filter((s) => s.slug !== service.slug).slice(0, 6);

  // `body` may be plain prose or the block JSON used by articles. Normalising
  // here keeps the template indifferent to which the CMS holds.
  let blocks: ContentBlock[] = [];
  const raw = service.body;
  if (Array.isArray(raw)) {
    blocks = raw as ContentBlock[];
  } else if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      blocks = Array.isArray(parsed)
        ? (parsed as ContentBlock[])
        : [{ type: "content", content: raw }];
    } catch {
      blocks = raw
        .split(/\n{2,}/)
        .map((p) => ({ type: "content", content: p.trim() }))
        .filter((b) => b.content);
    }
  }

  // Crumb paths are region-relative: regionCrumbs prefixes the region base.
  const crumbs = regionCrumbs(region, [
    { name: "Services", path: "/services" },
    { name: service.title, path: `/services/${service.slug}` },
  ]);

  return (
    <PageShell region={region}>
      <script {...jsonLdProps(breadcrumbSchema(crumbs))} />

      <div className={styles.bgContainer}>
        <div className={styles.topInnerContainer}>
          <div className={styles.leftContainer}>
            <div className={styles.dateContainer}>
              <Link className={styles.location} href={`${base}/services`}>
                Services
              </Link>
              <div className={styles.dot} />
              <span className={styles.date}>{region.label}</span>
            </div>

            <h1 className={styles.titleContainer}>{service.title}</h1>
          </div>

          {/* The hero is a fixed-height band; without artwork the right half sat
              empty. Art is a static asset per slug rather than a CMS upload so
              it renders regardless of the CMS being reachable, and because image
              upload on the Beacon CMS currently rejects every raster. */}
          <div className={styles.rightContainer}>
            <Image
              src={`/services/${service.slug}.png`}
              alt=""
              width={600}
              height={315}
              sizes="(max-width: 768px) 90vw, 600px"
              priority
            />
          </div>
        </div>
      </div>

      <div className={styles.container2}>
        <div className={styles.container2RightContainer}>
          {service.summary ? (
            <p className={styles.description}>{service.summary}</p>
          ) : null}

          {blocks.map((block, i) => (
            <BlogContentBlock key={i} block={block} />
          ))}

          {/* Scope sits after the narrative: it reads as a summary of what was
              just described, rather than a bare list before any context. */}
          {service.details && service.details.length > 0 ? (
            <BlogContentBlock
              block={{ type: "mainHeading", content: "What this service includes" }}
            />
          ) : null}
          {service.details && service.details.length > 0 ? (
            <BlogContentBlock block={{ type: "content", ul: service.details }} />
          ) : null}
        </div>

        <div className={styles.container2LeftContainer}>
          <div className={styles.alsoLike}>Other services:</div>
          {others.map((s) => (
            <Link key={s.documentId ?? s.slug} href={servicePath(s)}>
              <div className={styles.allBlogsContainer}>
                <div className={styles.allBlogsContainerTitle}>{s.title}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <ContactCta region={region} section={sectionByKey(sections, "contact-cta")} />
    </PageShell>
  );
}
