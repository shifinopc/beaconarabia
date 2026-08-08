import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import ContactCta from "@/components/ContactCta";
import { REGIONS, SITE_URL } from "@/lib/regions";
import { getOffices, officeSlug } from "@/lib/strapi";
import { breadcrumbSchema, jsonLdProps, titleCaseCity } from "@/lib/structured-data";

/**
 * Index for the per-office pages.
 *
 * Without it the seven city pages would be orphans, reachable only from each
 * other and from whatever external links they earn — the hub that makes them a
 * crawlable cluster rather than seven islands.
 */
export const metadata: Metadata = {
  // No "| Beacon" — the root layout's title template appends it.
  title: "Our Offices Across the GCC",
  description:
    "Beacon has offices in Riyadh, Jeddah, Dammam, Jazan, Dubai, Bahrain and Qatar. Find address, phone and directions for each.",
  alternates: { canonical: `${SITE_URL}/offices` },
};

const COUNTRY_NAMES: Record<string, string> = {
  ksa: "Saudi Arabia",
  uae: "United Arab Emirates",
  bahrain: "Bahrain",
  qatar: "Qatar",
};

/** Grouping order for the listing, densest market first. */
const COUNTRY_ORDER = ["ksa", "uae", "bahrain", "qatar"];

export default async function Page() {
  const offices = await getOffices();

  const schema = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Offices", path: "/offices" },
  ]);

  const countries = COUNTRY_ORDER.filter((c) => offices.some((o) => o.country === c));

  return (
    <PageShell region={REGIONS.global}>
      <script {...jsonLdProps(schema)} />

      <div className="officeContainer">
        <p className="officeEyebrow">Our offices</p>
        <h1>Beacon Offices Across the GCC</h1>
        <p className="officeLede">
          We advise companies from {offices.length} offices across the Gulf. Each one
          delivers the firm's full service line — incorporation, licensing, accounting,
          audit, taxation and government liaison — under the regulation that applies
          locally.
        </p>

        {countries.map((country) => (
          <section key={country}>
            <h2>{COUNTRY_NAMES[country] ?? country}</h2>
            <ul className="officeOtherList">
              {offices
                .filter((office) => office.country === country)
                .map((office) => {
                  const slug = officeSlug(office);
                  return (
                    <li key={slug}>
                      <Link href={`/offices/${slug}`}>
                        {titleCaseCity(office.city)}
                      </Link>
                      <span className="officeListAddress">{office.address}</span>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
      </div>

      <ContactCta region={REGIONS.global} />
    </PageShell>
  );
}
