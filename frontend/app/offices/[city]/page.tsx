import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import ContactCta from "@/components/ContactCta";
import { REGIONS, SITE_URL, regionUrl } from "@/lib/regions";
import { getOffices, officeSlug, type Office } from "@/lib/strapi";
import {
  breadcrumbSchema,
  jsonLdProps,
  officeSchema,
  titleCaseCity,
} from "@/lib/structured-data";

/**
 * Per-office location pages.
 *
 * Built for the local pack: Google renders map results *above* organic listings
 * for "business setup consultants in Riyadh"-shaped queries, and a verified
 * Google Business Profile plus a matching LocalBusiness page is what makes a
 * branch eligible. Seven offices previously shared one contact page, so there
 * was no per-city page for the profile to point at and nothing city-specific
 * for Google to rank.
 *
 * Generated from the Office content type rather than hand-written, so opening
 * or closing an office remains a CMS edit — the same principle OfficeLocations
 * follows on the contact page.
 *
 * NOTE FOR THE CMS: two fields would materially strengthen these pages and
 * cannot be invented here — latitude/longitude (for schema `geo`) and opening
 * hours (for `openingHoursSpecification`). Both are real local-ranking signals.
 * Adding them to the Office content type is the single highest-value follow-up.
 */

interface Params {
  city: string;
}

/**
 * Which country each office's services page belongs to.
 *
 * Saudi and UAE offices link into their regional editions; Bahrain and Qatar
 * have no regional site, so they point at the global one rather than a 404.
 */
const REGION_FOR_COUNTRY: Record<string, string> = {
  ksa: "sa",
  uae: "ae",
};

function regionKeyFor(office: Office) {
  const segment = REGION_FOR_COUNTRY[office.country];
  return segment === "sa" ? REGIONS.sa : segment === "ae" ? REGIONS.ae : REGIONS.global;
}

const COUNTRY_NAMES: Record<string, string> = {
  ksa: "Saudi Arabia",
  uae: "the United Arab Emirates",
  bahrain: "Bahrain",
  qatar: "Qatar",
};

async function findOffice(city: string): Promise<Office | null> {
  const offices = await getOffices();
  return offices.find((office) => officeSlug(office) === city) ?? null;
}

export async function generateStaticParams(): Promise<Params[]> {
  try {
    const offices = await getOffices();
    return offices.map((office) => ({ city: officeSlug(office) }));
  } catch {
    // A CMS outage during build must not fail the whole build; these pages are
    // regenerated on the next successful one.
    return [];
  }
}

/**
 * Only the offices that exist. An arbitrary /offices/anywhere should 404
 * rather than render an empty page that Google may index.
 */
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { city } = await params;
  const office = await findOffice(city);
  if (!office) return {};

  const cityName = titleCaseCity(office.city);
  const country = COUNTRY_NAMES[office.country] ?? office.country;

  return {
    // No "| Beacon" — the root layout's title template appends it.
    title: `Business Setup Services in ${cityName}`,
    description: `Beacon's ${cityName} office provides company formation, business consulting, accounting, audit and taxation services in ${country}. Visit us at ${office.address}.`,
    alternates: { canonical: `${SITE_URL}/offices/${city}` },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { city } = await params;
  const office = await findOffice(city);
  if (!office) notFound();

  const cityName = titleCaseCity(office.city);
  const country = COUNTRY_NAMES[office.country] ?? office.country;
  const region = regionKeyFor(office);
  const url = `${SITE_URL}/offices/${city}`;

  const schema = [
    officeSchema(office, url),
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Offices", path: "/offices" },
      { name: cityName, path: `/offices/${city}` },
    ]),
  ];

  return (
    <PageShell region={region}>
      <script {...jsonLdProps(schema)} />

      <div className="officeContainer">
        <p className="officeEyebrow">Our offices</p>
        <h1>Business Setup Services in {cityName}</h1>

        <p className="officeLede">
          Beacon advises companies incorporating and operating in {country} from our{" "}
          {cityName} office. We handle company formation, licensing and the regulatory
          approvals that follow, alongside ongoing accounting, audit and taxation support.
        </p>

        <div className="officeDetails">
          <section>
            <h2>Visit our {cityName} office</h2>
            {/* An address is a postal address, not a paragraph — <address> is
                what it is, and it gives assistive tech the right announcement. */}
            <address className="officeAddress">{office.address}</address>
            {office.mapUrl && (
              <p>
                <a href={office.mapUrl} target="_blank" rel="noreferrer">
                  View {cityName} office on Google Maps
                </a>
              </p>
            )}
          </section>

          {office.phones?.length ? (
            <section>
              <h2>Call the {cityName} team</h2>
              <ul className="officePhones">
                {office.phones.map((phone) => (
                  <li key={phone}>
                    <a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <section>
          <h2>What we do in {cityName}</h2>
          <p>
            Every Beacon office delivers the firm's full service line, adapted to local
            regulation: business incorporation and licensing, corporate structuring,
            accounting and bookkeeping, audit and taxation, PRO and government liaison,
            and technology services.
          </p>
          <p>
            <Link href={regionUrl(region, "services").replace(SITE_URL, "")}>
              See our full services in {country}
            </Link>{" "}
            or{" "}
            <Link href={regionUrl(region, "contact").replace(SITE_URL, "")}>
              get in touch with the team
            </Link>
            .
          </p>
        </section>

        <section>
          <h2>Our other offices</h2>
          <OtherOffices currentSlug={city} />
        </section>
      </div>

      <ContactCta region={region} />
    </PageShell>
  );
}

/**
 * Cross-links between the seven office pages.
 *
 * Isolated pages rank poorly; linking them to each other gives the cluster
 * internal structure and lets crawlers reach every one from any other.
 */
async function OtherOffices({ currentSlug }: { currentSlug: string }) {
  const offices = await getOffices();
  const others = offices.filter((office) => officeSlug(office) !== currentSlug);
  if (!others.length) return null;

  return (
    <ul className="officeOtherList">
      {others.map((office) => {
        const slug = officeSlug(office);
        return (
          <li key={slug}>
            <Link href={`/offices/${slug}`}>
              {titleCaseCity(office.city)}, {COUNTRY_NAMES[office.country] ?? office.country}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
