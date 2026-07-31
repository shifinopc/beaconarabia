import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import type { Region } from "@/lib/regions";
import {
  getClients,
  getFaqs,
  getSections,
  getTestimonials,
  mediaUrl,
  sectionByKey,
  type Section,
} from "@/lib/strapi";
import PageShell from "../PageShell";
import SectionHero from "../SectionHero";
import SectionCards from "../SectionCards";
import SectionSplit from "../SectionSplit";
import SectionBanner from "../SectionBanner";
import SectionAccordion from "../SectionAccordion";
import Clients from "../Clients";
import Faq from "../Faq";
import ContactCta from "../ContactCta";

/**
 * "Why Saudi" / "Why Dubai" — the regional landing pages.
 *
 * Ported from bg-beaconSaudi/src/app/pages/WhySaudi/page.js and
 * bg-BeaconUAE/src/app/pages/WhyDubai/page.js. Both were hardcoded in a
 * contents/Data.js and were lost when the three sites were consolidated; every
 * block now comes from the Section content type, keyed and region-scoped.
 *
 * Both legacy pages loaded their sections through `next/dynamic` with
 * `ssr: false`, so none of this copy was in the HTML a crawler saw — on the two
 * pages whose whole purpose is ranking for regional business-setup queries.
 * Server-rendered here.
 *
 * One component serves both regions: the page renders whatever `why-*` sections
 * the region has, in the order the CMS gives, picking a layout per key. A region
 * that adds a new section only needs a line in LAYOUTS if it wants something
 * other than the card grid.
 */

/** Section key → layout. Anything unlisted renders as a card grid. */
const LAYOUTS: Record<string, (section: Section) => ReactNode> = {
  "why-hero": (s) => <SectionHero section={s} />,
  "why-banner": (s) => <SectionBanner section={s} />,
  "why-process": (s) => <SectionAccordion section={s} />,
  // Image beside copy.
  "why-factors": (s) => <SectionSplit section={s} />,
  "why-agenda": (s) => <SectionSplit section={s} />,
};

export default async function WhyRegionPage({ region }: { region: Region }) {
  const [sections, clients, faqs, testimonials] = await Promise.all([
    getSections(region.strapiValue),
    getClients(region.strapiValue),
    getFaqs(region.strapiValue),
    getTestimonials(region.strapiValue),
  ]);

  // `home-*` sections belong to the homepage; this page owns the `why-*` ones.
  const pageSections = sections.filter((s) => s.key.startsWith("why-"));

  // 404 rather than publishing an empty shell if the CMS has nothing.
  if (!pageSections.length) notFound();

  const logos = clients
    .map((c) => mediaUrl(c.logo))
    .filter((url): url is string => Boolean(url));

  return (
    <PageShell region={region}>
      {pageSections.map((section) => {
        const render = LAYOUTS[section.key] ?? ((s: Section) => <SectionCards section={s} />);
        return <div key={section.documentId}>{render(section)}</div>;
      })}

      <Clients
        clients={clients}
        logos={logos}
        region={region}
        testimonials={testimonials}
        testimonialsSection={sectionByKey(sections, "testimonials-heading")}
        section={sectionByKey(sections, "clients-heading")}
        ebookSection={sectionByKey(sections, "ebook-banner")}
      />

      <Faq entries={faqs} section={sectionByKey(sections, "faq-heading")} />
      <ContactCta region={region} section={sectionByKey(sections, "contact-cta")} />
    </PageShell>
  );
}
