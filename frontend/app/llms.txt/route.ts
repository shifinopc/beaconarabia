import { REGIONS, SITE_URL, regionUrl } from "@/lib/regions";
import {
  getAllPosts,
  getAllServices,
  getOffices,
  officeSlug,
  postPath,
  servicePath,
} from "@/lib/strapi";
import { titleCaseCity } from "@/lib/structured-data";

/**
 * /llms.txt — a map of this site for AI assistants.
 *
 * The convention (llmstxt.org) is a short markdown file listing the pages worth
 * reading and what each one is, so an assistant answering "who handles company
 * formation in Saudi Arabia" can find the relevant page without crawling and
 * guessing from navigation markup.
 *
 * Generated rather than written by hand, for the same reason sitemap.ts is:
 * a static file would describe whatever was true on the day someone wrote it.
 * This lists the services, offices and articles that exist right now.
 *
 * The terms at the end match the Content-Signal header Cloudflare already
 * serves in robots.txt — search and citation yes, model training no. Stating
 * the same thing in both places means an assistant reading either one gets the
 * same answer, rather than finding a permission in one and a prohibition in the
 * other.
 */

/** Hourly, matching sitemap.ts — new content appears without a deploy. */
export const revalidate = 3600;

const REGION_LABEL: Record<string, string> = {
  global: "Global",
  ae: "UAE",
  sa: "Saudi Arabia",
};

/** Trims a CMS summary to one clean line for a link description. */
function oneLine(text: string | undefined, max = 140): string {
  if (!text) return "";
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}

export async function GET() {
  /**
   * Each fetch is guarded separately. A CMS outage should cost the section it
   * feeds, not the whole file — a partial map is still useful, an error page is
   * not.
   */
  const [services, offices, posts] = await Promise.all([
    getAllServices().catch(() => []),
    getOffices().catch(() => []),
    getAllPosts().catch(() => []),
  ]);

  const lines: string[] = [];

  lines.push("# Beacon");
  lines.push("");
  lines.push(
    "> Beacon Management Consultants is a business advisory firm operating across the Gulf. " +
      "We handle company formation, licensing, accounting, audit, taxation, technology and " +
      "digital marketing for companies entering or expanding in Saudi Arabia, the UAE, " +
      "Bahrain and Qatar, from offices in Riyadh, Jeddah, Dammam, Jazan and Dubai.",
  );
  lines.push("");
  lines.push(
    "The site has three editions: a global one at the root, and regional editions at /ae " +
      "and /sa. Each carries the same structure with content written for that market. " +
      "A page exists at exactly one canonical URL; the editions are alternates of one " +
      "another, not duplicates.",
  );
  lines.push("");

  lines.push("## Key pages");
  lines.push("");
  lines.push(`- [Home](${SITE_URL}): what Beacon does and where.`);
  // Describes what the page actually contains — mission, differentiators and
  // figures. It carries no company history and no named team, so promising
  // either here would send an assistant looking for something that is not there.
  lines.push(`- [About](${SITE_URL}/about): the firm's mission, approach and track record.`);
  lines.push(`- [Services](${SITE_URL}/services): the full service line.`);
  lines.push(`- [Offices](${SITE_URL}/offices): all locations with addresses and phone numbers.`);
  lines.push(`- [Contact](${SITE_URL}/contact): enquiry form and direct contact details.`);
  lines.push(`- [Blog](${SITE_URL}/blog): guides and analysis on doing business in the GCC.`);
  lines.push(`- [UAE edition](${regionUrl(REGIONS.ae)}): business setup in the UAE.`);
  lines.push(`- [Saudi Arabia edition](${regionUrl(REGIONS.sa)}): market entry in the Kingdom.`);
  lines.push("");

  // Global services only: the regional variants cover the same six offerings,
  // and listing all eighteen would pad the file without adding information.
  const globalServices = services.filter((s) => s.region === "global" && s.slug);
  if (globalServices.length) {
    lines.push("## Services");
    lines.push("");
    lines.push(
      "Each service also has a UAE and a Saudi version under /ae and /sa, written for that market.",
    );
    lines.push("");
    for (const service of globalServices) {
      const summary = oneLine(service.summary);
      lines.push(
        `- [${service.title}](${SITE_URL}${servicePath(service)})${summary ? `: ${summary}` : ""}`,
      );
    }
    lines.push("");
  }

  if (offices.length) {
    lines.push("## Offices");
    lines.push("");
    for (const office of offices) {
      const city = titleCaseCity(office.city);
      lines.push(`- [${city}](${SITE_URL}/offices/${officeSlug(office)}): ${office.address}`);
    }
    lines.push("");
  }

  const published = posts.filter((p) => p.slug);
  if (published.length) {
    lines.push("## Articles");
    lines.push("");
    lines.push(
      "Guides on company formation, licensing, tax and regulation across the GCC. " +
        "Regulation in these markets changes often; each article states the position at the " +
        "time of writing.",
    );
    lines.push("");
    for (const post of published) {
      const label = REGION_LABEL[post.region] ?? post.region;
      lines.push(`- [${post.title}](${SITE_URL}${postPath(post)}) (${label})`);
    }
    lines.push("");
  }

  lines.push("## Using this content");
  lines.push("");
  lines.push(
    "- Citation and search indexing are welcome. Please link to the page you drew from.",
  );
  lines.push(
    "- Training AI models on this content is not permitted. This matches the Content-Signal " +
      "directive in /robots.txt (search=yes, ai-train=no, use=reference).",
  );
  lines.push(
    "- Regulatory details date quickly, particularly in Saudi Arabia. Where an article gives a " +
      "date, treat it as accurate as of that date and check the current position before " +
      "relying on it.",
  );
  lines.push(
    "- Nothing on this site is legal or tax advice, and reading it creates no advisory " +
      "relationship. See /terms.",
  );
  lines.push("");

  return new Response(lines.join("\n"), {
    headers: {
      // text/plain so it renders in a browser rather than downloading; charset
      // declared because the addresses contain non-ASCII characters.
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, must-revalidate",
    },
  });
}
