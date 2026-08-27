import type { Metadata } from "next";
import RegionHome from "@/components/RegionHome";
import { REGIONS, alternatesFor } from "@/lib/regions";

/**
 * Global site — served at the domain root.
 *
 * This is a static route, so Next resolves it ahead of the sibling [region]
 * dynamic segment. That is what lets /about belong to the global site while
 * /ae and /sa route to the regional pages.
 */
/**
 * Title and description carry the markets, not just the positioning.
 *
 * The previous title — "Your Global Advisory Partner For Business Success" —
 * was the brand line, and it named neither a service nor a place. Search
 * console data backs up what that costs: five ranking keywords in Saudi, none
 * in the top ten, while the same site already appears in ten local packs. For a
 * firm whose realistic wins are "business setup in Riyadh"-shaped queries, the
 * strongest relevance signals on the site were spending themselves on a slogan.
 *
 * The brand line still leads the page visually — this changes the search
 * snippet, not the hero.
 *
 * "| Beacon" is written out here rather than left to the root layout's
 * `%s | Beacon` template. That template only applies to *nested* segments, and
 * app/page.tsx sits in the same segment as the layout that defines it, so the
 * homepage — the one page most likely to be seen in a brand search — would
 * otherwise be the only page on the site without the brand in its title.
 */
export const metadata: Metadata = {
  title: "Business Setup & Advisory in Saudi Arabia & UAE | Beacon",
  description:
    "Business setup and advisory in Saudi Arabia and the UAE. Company formation, licensing, accounting, audit and tax, from offices in Riyadh, Jeddah and Dubai.",
  alternates: alternatesFor(REGIONS.global),
};

export default function GlobalHomePage() {
  return <RegionHome region={REGIONS.global} />;
}
