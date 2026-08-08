import type { Metadata } from "next";
import LegalPage, { type LegalSection } from "@/components/pages/LegalPage";
import { REGIONS, regionUrl } from "@/lib/regions";

/**
 * Drafted 2026-08-08. Same caveat as the privacy policy: written from what the
 * site and business actually do, but not legal advice — owner review required.
 */
export const metadata: Metadata = {
  // No "| Beacon" here — the root layout's title template appends it.
  title: "Terms of Service",
  description:
    "The terms that govern your use of beaconarabia.com and the information published on it.",
  // Canonical only — global-only page, hreflang would point at 404s.
  alternates: { canonical: regionUrl(REGIONS.global, "terms") },
};

const SECTIONS: LegalSection[] = [
  {
    heading: "Using this site",
    body: [
      "By using beaconarabia.com you accept these terms. If you do not accept them, do not use the site.",
      "You may browse, read and share links to this site freely. You may not scrape it at scale, attempt to breach its security, submit forms with false or automated content, or use it in any way that breaks the law of the UAE, Saudi Arabia, or your own jurisdiction.",
    ],
  },
  {
    heading: "Content is information, not advice",
    body: [
      "Articles, guides and other content on this site are general information about doing business in the GCC. They are not legal, tax, accounting or investment advice, and reading them does not create an advisory relationship with Beacon.",
      "Regulations in the UAE and Saudi Arabia change frequently. We work to keep content accurate, but we make no guarantee that any page reflects the current state of the law. Confirm anything material with a qualified professional — including us, through an actual engagement — before acting on it.",
    ],
  },
  {
    heading: "Our services",
    body: [
      "Advisory services are provided under separate engagement agreements, not through this website. Submitting an enquiry form is a request for contact, not the start of an engagement, and creates no obligation on either side.",
    ],
  },
  {
    heading: "Intellectual property",
    body: [
      "The Beacon name, logo, and the content of this site belong to Beacon or its licensors. Quote and link freely with attribution; do not republish substantial portions of the site or use the brand without permission.",
    ],
  },
  {
    heading: "Liability",
    body: [
      "The site is provided as-is. To the fullest extent the law allows, Beacon is not liable for loss arising from reliance on the site's content, from interruptions to its availability, or from third-party sites we link to. Nothing in these terms excludes liability that cannot lawfully be excluded.",
    ],
  },
  {
    heading: "Privacy",
    body: [
      "Personal information submitted through the site is handled as described in our Privacy Policy at beaconarabia.com/privacy-policy.",
    ],
  },
  {
    heading: "Changes and governing law",
    body: [
      "We may update these terms; the version on this page at the time you use the site is the one that applies, and the “last updated” date reflects the latest change.",
      "These terms are governed by the laws of the United Arab Emirates. For services delivered by our Saudi offices, mandatory provisions of Saudi law apply to those services.",
    ],
  },
];

export default function Page() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="8 August 2026"
      intro="These terms govern your use of beaconarabia.com. The short version: the site is public information about doing business in the GCC, it is not professional advice, and actual advisory work happens under separate written engagements."
      sections={SECTIONS}
    />
  );
}
