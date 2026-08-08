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
 * Deliberately omitted: `geo` and `openingHoursSpecification`. Both are strong
 * local-ranking signals, and both would have to be invented here — the Office
 * content type stores neither. Wrong coordinates are worse than absent ones,
 * so they are left out until the CMS can supply real values. See the note in
 * app/offices/[city]/page.tsx.
 */
export function officeSchema(office: {
  city: string;
  country: string;
  address: string;
  phones?: string[] | null;
  mapUrl?: string;
}, url: string): JsonLd {
  const countryName = OFFICE_COUNTRY_NAMES[office.country] ?? office.country;
  const cityName = titleCaseCity(office.city);

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
    areaServed: { "@type": "Country", name: countryName },
  };
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
