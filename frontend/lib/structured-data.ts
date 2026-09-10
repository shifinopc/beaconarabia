import { SITE_URL, type Region } from "./regions";
import type { SiteInfo } from "./site";
import type { Post } from "./strapi";

/**
 * schema.org JSON-LD builders.
 *
 * These describe the business to search engines in a form they parse
 * unambiguously, rather than leaving them to infer it from page copy. It is
 * what makes a knowledge-panel entry, breadcrumb trails in results, and article
 * rich results possible — none of which the three legacy sites emitted.
 *
 * Everything is derived from values the site already has (SiteInfo from the
 * CMS, the region definitions, the post itself) so the structured data cannot
 * drift away from what's rendered — which is both a maintenance problem and,
 * to Google, a spam signal.
 */

/** A stable, page-independent id for the company node, so pages can reference it. */
const ORGANISATION_ID = `${SITE_URL}/#organization`;

export interface JsonLd {
  "@context": "https://schema.org";
  [key: string]: unknown;
}

/**
 * The company itself.
 *
 * ProfessionalService rather than plain Organization: it is a subtype of
 * LocalBusiness, which is the right shape for a consultancy with physical
 * offices and lets the address and contact details be understood as such.
 */
export function organisationSchema(site: SiteInfo): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": ORGANISATION_ID,
    name: site.copyrightHolder,
    alternateName: "Beacon",
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
    image: `${SITE_URL}/icon.svg`,
    email: site.email,
    telephone: site.phones,
    address: {
      "@type": "PostalAddress",
      streetAddress: site.office.lines.join(", "),
      addressCountry: "SA",
    },
    hasMap: site.office.mapUrl,
    // Only the profiles the CMS actually lists — an unreachable sameAs link is
    // worse than none, since it weakens the entity match.
    sameAs: site.social.map((s) => s.href).filter((href) => /^https?:\/\//.test(href)),
    areaServed: [
      { "@type": "Country", name: "Saudi Arabia" },
      { "@type": "Country", name: "United Arab Emirates" },
      { "@type": "Place", name: "GCC" },
    ],
  };
}

/**
 * The site, with its search-independent identity.
 *
 * Kept separate from the organisation node so both can be referenced by @id
 * without repeating either.
 */
export function websiteSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: "Beacon",
    publisher: { "@id": ORGANISATION_ID },
    inLanguage: "en",
  };
}

/**
 * One service offering.
 *
 * The service pages previously emitted only a breadcrumb and the site-wide
 * organisation node, which told a search or answer engine that a page existed
 * but nothing about what it sells. These are the commercial pages — the ones an
 * assistant should be able to quote when asked who handles company formation in
 * Saudi Arabia — and they were the least described on the site.
 *
 * Every field is taken from the CMS entry and is visible on the page. Nothing
 * here is invented: `hasOfferCatalog` lists the sub-services already rendered
 * in the body, so the markup and the page agree. That matters beyond honesty —
 * schema describing content a visitor cannot see is treated as spam.
 *
 * Deliberately no `offers` or `priceRange`: Beacon does not publish prices, and
 * inventing a price band to win a rich result would be a lie about a
 * professional service.
 */
export function serviceSchema(
  service: { title: string; summary?: string; details?: string[] | null },
  region: Region,
  url: string,
): JsonLd {
  // Matches the organisation node's own areaServed, narrowed to the edition the
  // page belongs to — a Saudi service page should not claim UAE coverage.
  const areaServed =
    region.key === "ae"
      ? [{ "@type": "Country", name: "United Arab Emirates" }]
      : region.key === "sa"
        ? [{ "@type": "Country", name: "Saudi Arabia" }]
        : [
            { "@type": "Country", name: "Saudi Arabia" },
            { "@type": "Country", name: "United Arab Emirates" },
            { "@type": "Place", name: "GCC" },
          ];

  const subServices = (service.details ?? []).filter(
    (detail) => typeof detail === "string" && detail.trim(),
  );

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name: service.title,
    ...(service.summary?.trim() ? { description: service.summary.trim() } : {}),
    url,
    serviceType: service.title,
    provider: { "@id": ORGANISATION_ID },
    areaServed,
    // Omitted entirely when a service has no sub-services listed, rather than
    // emitting an empty catalogue.
    ...(subServices.length
      ? {
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: `${service.title} services`,
            itemListElement: subServices.map((detail) => ({
              "@type": "Offer",
              itemOffered: { "@type": "Service", name: detail },
            })),
          },
        }
      : {}),
  };
}

/** ISO 3166-1 alpha-2 for each country the Office content type knows about. */
const OFFICE_COUNTRY_CODES: Record<string, string> = {
  ksa: "SA",
  uae: "AE",
  bahrain: "BH",
  qatar: "QA",
};

const OFFICE_COUNTRY_NAMES: Record<string, string> = {
  ksa: "Saudi Arabia",
  uae: "United Arab Emirates",
  bahrain: "Bahrain",
  qatar: "Qatar",
};

/**
 * One physical office, as a LocalBusiness branch of the company.
 *
 * This is the piece that makes an office eligible to appear in Google's local
 * pack — the map results that render *above* organic listings for queries like
 * "business setup consultants in Riyadh". The organisation node above describes
 * the company as a whole and carries a single address; it cannot represent
 * seven of them.
 *
 * `parentOrganization` points back at the company node by @id, so the seven
 * branches are understood as one business with seven locations rather than
 * seven unrelated firms — which is what emitting seven bare LocalBusiness nodes
 * would imply.
 *
 * `geo` and `openingHoursSpecification` are emitted only when the CMS carries
 * real values. Both are strong local-ranking signals and both were previously
 * omitted entirely because the content type had nowhere to store them; the
 * fields exist now, but an office nobody has filled in yet still publishes
 * neither. A pin in the wrong place is worse than no pin.
 */
export function officeSchema(office: {
  city: string;
  country: string;
  address: string;
  phones?: string[] | null;
  mapUrl?: string;
  latitude?: number | null;
  longitude?: number | null;
  openDays?: string[] | null;
  opensAt?: string | null;
  closesAt?: string | null;
}, url: string): JsonLd {
  const countryName = OFFICE_COUNTRY_NAMES[office.country] ?? office.country;
  const cityName = titleCaseCity(office.city);
  // Same helper the page uses to print the hours, so the markup and the
  // sentence a visitor reads can never disagree.
  const hours = officeHours(office);

  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${url}#office`,
    name: `Beacon — ${cityName}`,
    parentOrganization: { "@id": ORGANISATION_ID },
    url,
    address: {
      "@type": "PostalAddress",
      streetAddress: office.address,
      addressLocality: cityName,
      addressCountry: OFFICE_COUNTRY_CODES[office.country] ?? office.country,
    },
    ...(office.phones?.length ? { telephone: office.phones } : {}),
    ...(office.mapUrl ? { hasMap: office.mapUrl } : {}),
    ...(typeof office.latitude === "number" && typeof office.longitude === "number"
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: office.latitude,
            longitude: office.longitude,
          },
        }
      : {}),
    ...(hours
      ? {
          openingHoursSpecification: [
            {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: hours.days,
              opens: hours.opens,
              closes: hours.closes,
            },
          ],
        }
      : {}),
    areaServed: { "@type": "Country", name: countryName },
  };
}

/** The seven day names schema.org accepts, in week order for display. */
const DAY_ORDER = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Turns a Strapi `time` ("09:00:00.000") into "09:00".
 *
 * schema.org wants HH:MM, and so does a human reading a page — nobody needs
 * to be told an office opens at nine o'clock and zero milliseconds.
 */
function toClockTime(value?: string | null): string | null {
  if (!value) return null;
  const match = /^(\d{2}):(\d{2})/.exec(value.trim());
  return match ? `${match[1]}:${match[2]}` : null;
}

/**
 * Opening hours in a form both the page and the schema can use.
 *
 * Returns null unless all three parts are present. Half-configured hours —
 * days but no times, or times but no days — would produce either an incomplete
 * schema node or a sentence with a gap in it, and an office that has not been
 * filled in yet should simply show nothing.
 */
export function officeHours(office: {
  openDays?: string[] | null;
  opensAt?: string | null;
  closesAt?: string | null;
}): { days: string[]; opens: string; closes: string; label: string } | null {
  const opens = toClockTime(office.opensAt);
  const closes = toClockTime(office.closesAt);
  if (!opens || !closes) return null;

  const days = (office.openDays ?? [])
    .map((day) => String(day).trim())
    // Guard against a typo in the CMS reaching the markup: schema.org only
    // recognises these seven names, and an invented one invalidates the node.
    .filter((day) => DAY_ORDER.includes(day))
    .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  if (!days.length) return null;

  // "Sunday to Thursday" when the listed days run consecutively in week order,
  // otherwise the days themselves — a Sunday/Tuesday/Thursday office should not
  // be described as opening Sunday to Thursday.
  const first = DAY_ORDER.indexOf(days[0]);
  const consecutive = days.every((day, i) => DAY_ORDER.indexOf(day) === first + i);
  const label =
    days.length > 1 && consecutive
      ? `${days[0]} to ${days[days.length - 1]}, ${opens} to ${closes}`
      : `${days.join(", ")}, ${opens} to ${closes}`;

  return { days, opens, closes, label };
}

/**
 * Office cities are stored inconsistently — "JEDDAH", "Riyadh", "DUBAI" — so
 * anything user-facing has to normalise rather than print the raw value.
 */
export function titleCaseCity(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export interface Crumb {
  name: string;
  /** Path relative to the site root, e.g. "/ae/about". */
  path: string;
}

/**
 * Breadcrumb trail.
 *
 * Worth emitting even though the design has no visible breadcrumb: Google uses
 * it to replace the raw URL in results with a readable hierarchy, which matters
 * more here than usual because the regional URLs (/sa/why-saudi) are otherwise
 * opaque in a listing.
 */
export function breadcrumbSchema(crumbs: Crumb[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.path}`,
    })),
  };
}

/** Breadcrumbs for a page within a region, always rooted at that region's home. */
export function regionCrumbs(region: Region, trail: Crumb[] = []): Crumb[] {
  const base = region.segment ? `/${region.segment}` : "";
  return [
    { name: region.segment ? region.label : "Home", path: base || "/" },
    ...trail.map((crumb) => ({ ...crumb, path: `${base}${crumb.path}` })),
  ];
}

/**
 * FAQ rich results.
 *
 * The FAQs are already on the page in an accordion; this states the
 * question/answer pairing explicitly so Google can expand the listing rather
 * than inferring structure from markup. Worth having because the answers are
 * substantial and the queries they match are exactly the ones this business
 * competes for.
 *
 * Google requires the marked-up content to be visible on the page and the
 * answers to be complete — both true of the accordion, which hides answers
 * behind a toggle rather than omitting them.
 */
export function faqSchema(entries: { question: string; answer: string }[]): JsonLd | null {
  const usable = entries.filter((e) => e.question?.trim() && e.answer?.trim());
  if (!usable.length) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: usable.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer,
      },
    })),
  };
}

export function articleSchema(post: Post, description: string, imageUrl?: string | null): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description,
    ...(imageUrl ? { image: imageUrl } : {}),
    // No dateModified: the Post type carries only publishedAt, and claiming a
    // modification date we don't have would be a fabricated signal.
    datePublished: post.publishedAt ?? undefined,
    author: { "@id": ORGANISATION_ID },
    publisher: { "@id": ORGANISATION_ID },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blog/${post.slug}`,
    },
    inLanguage: "en",
  };
}

/**
 * Renders one or more JSON-LD blocks as props for a <script> tag.
 *
 * JSON.stringify escapes nothing that matters here except `<`, which could end
 * the script element early if it ever appeared in CMS content — so it is
 * escaped explicitly rather than trusted not to occur.
 */
export function jsonLdProps(schema: JsonLd | JsonLd[]) {
  const json = JSON.stringify(schema).replace(/</g, "\\u003c");
  return { type: "application/ld+json", dangerouslySetInnerHTML: { __html: json } };
}
