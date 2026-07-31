import { REGIONS, SUB_REGIONS, WHY_PAGES, type Region } from "./regions";

export interface NavItem {
  text: string;
  href: string;
  hasDropdown?: boolean;
}

/**
 * Region-aware navigation.
 *
 * The legacy header hardcoded paths like `/pages/About/` and, in the "Explore"
 * dropdown, linked out to the separate subdomains
 * (https://ksa.beaconarabia.com, https://www.uae.beaconarabia.com). In the
 * consolidated site those become internal routes, so region switching no longer
 * costs a full cross-domain page load — and the link equity stays on one host.
 */
export function navFor(region: Region): NavItem[] {
  const base = region.segment ? `/${region.segment}` : "";
  const why = WHY_PAGES[region.key];

  return [
    { text: "Home", href: base || "/" },
    { text: "Explore", href: "#", hasDropdown: true },
    { text: "About Us", href: `${base}/about` },
    { text: "Services", href: `${base}/services` },
    // "Why Dubai" / "Why Saudi" — regional sites only, as in the legacy nav.
    ...(why ? [{ text: why.label, href: `${base}/${why.slug}` }] : []),
    { text: "Blogs", href: `${base}/blog` },
    { text: "Contact Us", href: `${base}/contact` },
  ];
}

/**
 * Regions offered in the "Explore" dropdown — everything except the current one.
 *
 * The global link carries `?region=global` because proxy.ts geo-redirects the
 * bare `/` for visitors in AE/SA. Without the parameter, someone in Dubai who
 * arrived straight on /ae from a search result would click "Global" and be sent
 * right back to /ae, with no way through. The parameter records the choice and
 * proxy.ts strips it, so the address bar still ends up on a clean `/`. Regional
 * links need no equivalent: the redirect only ever targets `/`.
 */
export function regionLinksFor(current: Region) {
  return [REGIONS.global, ...SUB_REGIONS]
    .filter((r) => r.key !== current.key)
    .map((r) => ({
      label: r.label,
      href: r.segment ? `/${r.segment}` : "/?region=global",
    }));
}

export const CONTACT_PHONE = "+971 527 733 789";
export const CONTACT_PHONE_HREF = "tel:+971527733789";
