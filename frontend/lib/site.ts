import { getSiteSettings, type SiteSettings, type SocialLink } from "./strapi";

/**
 * Company-wide contact details and social links.
 *
 * These now live in the Strapi "Site Settings" single type so they can be
 * updated without a deploy — a changed phone number or office address should
 * not require a developer. The values below are the fallback used when the CMS
 * is unreachable or the entry has not been filled in, so the footer never
 * renders blank.
 */
export interface SiteInfo {
  email: string;
  phones: string[];
  whatsapp: string;
  office: { lines: string[]; mapUrl: string };
  social: SocialLink[];
  copyrightHolder: string;
}

export const SITE_FALLBACK: SiteInfo = {
  email: "mail@beaconarabia.com",
  phones: ["+966 570 807 175", "+971 527 733 789"],
  whatsapp: "https://wa.me/+971527733789",
  office: {
    lines: ["Le Cygne Commercial Center, Kaab", "Bin Malik Street, Al Olaya, Riyadh 12611"],
    mapUrl: "https://maps.app.goo.gl/vWfGvAjAcHxV9AUT9",
  },
  social: [
    { name: "WhatsApp", href: "https://wa.me/+971527733789", icon: "/NewSvgs/SVG3/hh/Icon-3.svg" },
    {
      name: "Instagram",
      href: "https://www.instagram.com/beaconconsultants",
      icon: "/NewSvgs/SVG3/hh/Icon-4.svg",
    },
    {
      name: "Facebook",
      href: "https://www.facebook.com/people/Beacon-Management-Consultants/100086432425064/",
      icon: "/NewSvgs/SVG3/hh/Icon-5.svg",
    },
    {
      name: "LinkedIn",
      href: "https://www.linkedin.com/company/beacon-management-consultants/",
      icon: "/NewSvgs/SVG3/hh/Icon-6.svg",
    },
  ],
  copyrightHolder: "Beacon Management Consultants CO.LTD",
};

/** Merges the CMS entry over the fallback, field by field. */
export function toSiteInfo(cms: SiteSettings | null): SiteInfo {
  if (!cms) return SITE_FALLBACK;
  return {
    email: cms.email || SITE_FALLBACK.email,
    phones: cms.phones?.length ? cms.phones : SITE_FALLBACK.phones,
    whatsapp: cms.whatsapp || SITE_FALLBACK.whatsapp,
    office: {
      lines: cms.officeAddress
        ? cms.officeAddress.split("\n").filter(Boolean)
        : SITE_FALLBACK.office.lines,
      mapUrl: cms.officeMapUrl || SITE_FALLBACK.office.mapUrl,
    },
    social: cms.socials?.length ? cms.socials : SITE_FALLBACK.social,
    copyrightHolder: cms.copyrightHolder || SITE_FALLBACK.copyrightHolder,
  };
}

/** Server-side helper: fetch settings and merge with the fallback. */
export async function loadSiteInfo(): Promise<SiteInfo> {
  return toSiteInfo(await getSiteSettings());
}
