import type { Metadata } from "next";
import { alternatesFor, REGIONS, type RegionKey } from "./regions";

/**
 * Titles and descriptions for the regional section pages.
 *
 * Every one of these routes previously hardcoded a bare noun — `title: "About
 * Us"`, `title: "Services"` — with a description templated as
 * `...In ${region.label}.`. That produced twelve pages sharing six titles:
 * /ae/about and /sa/about were both "About Us | Beacon", and so on through
 * services, careers, contact, partners and blog. Two regional editions built
 * specifically to avoid competing with each other were competing with each
 * other, and not one of the twelve titles named a market.
 *
 * The copy lives here rather than in the six route files because it is one
 * decision — how each market presents itself — and splitting it across routes
 * is how it drifted in the first place. Titles are written to land near 50-60
 * characters once the root layout appends `| Beacon`, so none carries the brand
 * itself.
 *
 * Global routes are not here: they use pageMetadata(), which reads seoTitle and
 * seoDescription from the CMS so editors can change them without a deploy.
 * These regional routes have no CMS Page entries behind them, which is why they
 * need compiled copy at all — worth revisiting if editors ever need to tune
 * them.
 */

type PageKey = "about" | "services" | "careers" | "contact" | "partners" | "blog";

interface Copy {
  title: string;
  description: string;
}

const COPY: Record<"ae" | "sa", Record<PageKey, Copy>> = {
  ae: {
    about: {
      title: "About Our Dubai Business Advisory Practice",
      description:
        "Beacon advises companies incorporating and operating in the UAE. Meet the team behind our mainland, free zone and offshore business setup work in Dubai.",
    },
    services: {
      title: "Business Setup & Advisory Services in the UAE",
      description:
        "Company incorporation, licensing, accounting, audit, taxation and technology services for businesses in the UAE, delivered from our Dubai office.",
    },
    careers: {
      title: "Business Consulting Careers in Dubai, UAE",
      description:
        "Build a consulting career with Beacon in the UAE. See current openings in business setup, accounting, audit and client advisory at our Dubai office.",
    },
    contact: {
      title: "Contact Our Dubai Office for UAE Business Setup",
      description:
        "Speak to Beacon about incorporating or growing a company in the UAE. Call or visit our Dubai office on Al Rigga Road, or send an enquiry and we will reply.",
    },
    partners: {
      // Not "Partner With Beacon" — the layout appends "| Beacon", and the
      // brand twice in one title reads as an error rather than emphasis.
      title: "Referral & Partner Programme in the UAE",
      description:
        "Refer clients or collaborate with Beacon on UAE market entry. We work with law firms, accountants and consultancies serving businesses moving into Dubai.",
    },
    blog: {
      title: "UAE Business Setup Insights & Guides",
      description:
        "Guides and analysis on company formation, licensing, free zones and regulation in the UAE, written by the Beacon team in Dubai.",
    },
  },
  sa: {
    about: {
      title: "About Our Saudi Arabia Advisory Practice",
      description:
        "Beacon advises companies entering and operating in Saudi Arabia. Meet the team behind our market entry work across Riyadh, Jeddah, Dammam and Jazan.",
    },
    services: {
      title: "Business Setup & Advisory Services in Saudi Arabia",
      description:
        "MISA registration, company formation, licensing, accounting, audit and taxation for businesses in the Kingdom, from our Riyadh, Jeddah and Dammam offices.",
    },
    careers: {
      title: "Business Consulting Careers in Saudi Arabia",
      description:
        "Build a consulting career with Beacon in the Kingdom. See current openings in business setup, accounting, audit and client advisory across our Saudi offices.",
    },
    contact: {
      title: "Contact Our Riyadh, Jeddah & Dammam Offices",
      description:
        "Speak to Beacon about entering or expanding in the Saudi market. Call or visit our offices in Riyadh, Jeddah, Dammam and Jazan, or send us an enquiry.",
    },
    partners: {
      // See the UAE note above: the layout supplies the brand.
      title: "Referral & Partner Programme in Saudi Arabia",
      description:
        "Refer clients or collaborate with Beacon on Saudi market entry. We work with law firms, accountants and consultancies serving businesses entering the Kingdom.",
    },
    blog: {
      title: "Saudi Arabia Business Insights & Guides",
      description:
        "Guides and analysis on MISA registration, company formation, licensing and Vision 2030 in Saudi Arabia, written by the Beacon team in the Kingdom.",
    },
  },
};

/**
 * Metadata for one regional section page, including the canonical and hreflang
 * alternates that pair it with its counterparts in the other editions.
 */
export function regionPageMetadata(segment: "ae" | "sa", page: PageKey): Metadata {
  const region = REGIONS[segment as RegionKey];
  const copy = COPY[segment][page];

  return {
    title: copy.title,
    description: copy.description,
    alternates: alternatesFor(region, page),
  };
}
