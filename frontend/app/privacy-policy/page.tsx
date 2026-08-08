import type { Metadata } from "next";
import LegalPage, { type LegalSection } from "@/components/pages/LegalPage";
import { REGIONS, regionUrl } from "@/lib/regions";

/**
 * Drafted 2026-08-08 from what the site actually does: three enquiry forms
 * (contact, newsletter, popup) storing name/email/phone/message in the CMS,
 * Google Analytics 4, Cloudflare in front of everything, and email
 * notifications to the team. If any of that changes, this page must too.
 * Reviewed content, not boilerplate — but it is not legal advice, and a
 * qualified review before relying on it is the owner's responsibility.
 */
export const metadata: Metadata = {
  // No "| Beacon" here — the root layout's title template appends it.
  title: "Privacy Policy",
  description:
    "How Beacon collects, uses and protects personal information submitted through beaconarabia.com.",
  // Canonical only — this page exists once, globally, so hreflang alternates
  // pointing at /ae/... and /sa/... would name URLs that 404.
  alternates: { canonical: regionUrl(REGIONS.global, "privacy-policy") },
};

const SECTIONS: LegalSection[] = [
  {
    heading: "Who we are",
    body: [
      "Beacon (“we”, “us”) is a business advisory firm operating in the United Arab Emirates and the Kingdom of Saudi Arabia. This policy covers personal information collected through beaconarabia.com, including its regional editions at /ae and /sa.",
      "You can reach us about anything in this policy at mail@beaconarabia.com.",
    ],
  },
  {
    heading: "What we collect",
    body: [
      "You give us information directly when you use a form on this site:",
      "• Contact and popup enquiry forms — your name, email address, phone number and message.",
      "• Newsletter signup — your email address.",
      "We do not knowingly collect information from children, and none of our services are directed at them.",
    ],
  },
  {
    heading: "What we collect automatically",
    body: [
      "We use Google Analytics to understand how the site is used — pages visited, approximate location at city level, device and browser type. This relies on cookies and similar identifiers. Google's own privacy policy applies to its processing.",
      "Our infrastructure providers (including Cloudflare, which sits in front of this site) log requests — IP address, user agent, pages requested — for security and performance. These logs are not used to identify you.",
    ],
  },
  {
    heading: "How we use it",
    body: [
      "• To respond to your enquiry — that is the sole purpose of the contact and popup forms.",
      "• To send you the newsletter you signed up for. Every issue includes a way to unsubscribe.",
      "• To keep the site working, secure and improving.",
      "We do not sell personal information, and we do not share it with third parties for their own marketing.",
    ],
  },
  {
    heading: "Where it lives and how long we keep it",
    body: [
      "Form submissions are stored in our content-management system, hosted on infrastructure in Europe, and copies arrive by email to the relevant Beacon team. We keep enquiries for as long as needed to handle them and for a reasonable period afterwards for record-keeping, then delete them.",
      "Newsletter addresses are kept until you unsubscribe.",
    ],
  },
  {
    heading: "Your choices and rights",
    body: [
      "• You can ask us what personal information we hold about you, ask us to correct it, or ask us to delete it — email mail@beaconarabia.com and we will respond within a reasonable time.",
      "• You can unsubscribe from the newsletter at any time.",
      "• You can block or clear cookies in your browser; the site works without them, though analytics will no longer see your visit.",
      "Depending on where you live — including under the UAE Personal Data Protection Law and the Saudi Personal Data Protection Law — you may have additional statutory rights over your personal data. We honour requests under those laws.",
    ],
  },
  {
    heading: "Security",
    body: [
      "The site is served over HTTPS only. Form submissions are validated and rate-limited, access to stored enquiries is restricted to authorised staff, and our systems sit behind industry-standard protections. No system is perfectly secure, but we take reasonable measures appropriate to the data we hold.",
    ],
  },
  {
    heading: "Changes to this policy",
    body: [
      "If we change what we collect or how we use it, we will update this page and its “last updated” date. Material changes will be flagged on the site.",
    ],
  },
];

export default function Page() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="8 August 2026"
      intro="This page explains what personal information beaconarabia.com collects, why, and what your choices are. The short version: we collect what you type into our forms, we use it only to respond to you, and we do not sell it to anyone."
      sections={SECTIONS}
    />
  );
}
