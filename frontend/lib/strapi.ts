/**
 * Minimal typed client for the Strapi 5 REST API.
 *
 * Strapi 5 flattens the response shape compared with v4: fields live directly
 * on the entry rather than under `attributes`.
 */

import type { RegionKey } from "./regions";

/**
 * Public origin of the CMS — the one a *browser* uses. Media URLs handed to the
 * client are built from this, and next.config.ts derives the `next/image`
 * remotePatterns allowlist from it.
 *
 * `||` rather than `??` on purpose: a host whose env-var UI writes an empty
 * string for an unset variable would otherwise sail past a `??` fallback and
 * hand `new URL("")` an empty input, which throws ERR_INVALID_URL at config
 * load and takes the whole app down before it can log anything useful.
 */
const STRAPI_URL = process.env.STRAPI_URL || "http://localhost:1337";

/**
 * Origin *this server* uses to reach the CMS. Defaults to the public one, which
 * is right anywhere the server can resolve its own public hostname.
 *
 * Some shared hosts can't. If DNS is proxied (Cloudflare) and the host blocks
 * loopback hairpinning, the origin has no route back to its own domain: every
 * server-side fetch to https://cms.example.com hangs until it times out, which
 * during a static build means every prerendered page fails at once. Pointing
 * this at http://127.0.0.1:1337 fixes that, and it has to be a *separate*
 * variable from STRAPI_URL — reusing one would put a loopback address into the
 * HTML as image src attributes, which next/image rejects in production as an
 * SSRF risk.
 */
const STRAPI_INTERNAL_URL = process.env.STRAPI_INTERNAL_URL || STRAPI_URL;

const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

export interface StrapiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface StrapiImage {
  url: string;
  alternativeText?: string | null;
  width?: number;
  height?: number;
}

export interface Service {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  summary?: string;
  body?: string;
  region: RegionKey;
  icon?: StrapiImage | null;
  order?: number;
  /** Sub-services listed in the services-page hover overlay. */
  details?: string[] | null;
}

export interface Page {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  body?: string;
  region: RegionKey;
  seoTitle?: string;
  seoDescription?: string;
}

export interface Post {
  id: number;
  documentId: string;
  title: string;
  /** Headline shown on cards; the legacy Sanity docs used `subtitle` for this. */
  subtitle?: string;
  slug: string;
  /** Green pill label — mapped from Sanity's misleadingly-named `location`. */
  category?: string;
  excerpt?: string;
  body?: string;
  region: RegionKey;
  publishedAt?: string;
  cover?: StrapiImage | null;
  /** Migrated article body: an ordered list of heading/text/list/image blocks. */
  contentBlocks?: unknown[] | null;
}

export interface Faq {
  id: number;
  documentId: string;
  question: string;
  answer: string;
  region: RegionKey;
}

export interface Homepage {
  id: number;
  documentId: string;
  region: RegionKey;
  heroTitle: string;
  heroDescription?: string;
  heroCtaLabel?: string;
  heroCtaHref?: string;
  heroImage?: StrapiImage | null;
  heroImageMobile?: StrapiImage | null;
}

export interface Office {
  id: number;
  documentId: string;
  city: string;
  country: "ksa" | "uae" | "bahrain" | "qatar";
  address: string;
  phones?: string[] | null;
  mapUrl?: string;
  wide?: boolean;
  order?: number;
}

export interface Stat {
  id: number;
  documentId: string;
  label: string;
  value: number;
  suffix?: string;
  order?: number;
  region: RegionKey;
}

export interface Testimonial {
  id: number;
  documentId: string;
  message: string;
  name: string;
  designation?: string;
  order?: number;
  region: RegionKey;
}

export interface SocialLink {
  name: string;
  href: string;
  icon: string;
}

export interface SiteSettings {
  email?: string;
  phones?: string[] | null;
  whatsapp?: string;
  officeAddress?: string;
  officeMapUrl?: string;
  socials?: SocialLink[] | null;
  copyrightHolder?: string;
}

export interface PartnerBenefit {
  id: number;
  documentId: string;
  title: string;
  description?: string;
  icon?: StrapiImage | null;
  order?: number;
  region: RegionKey;
}

export interface Job {
  id: number;
  documentId: string;
  title: string;
  employmentType?: string;
  location?: string;
  details?: string[] | null;
  order?: number;
  region: RegionKey;
}

export interface CareerHighlight {
  id: number;
  documentId: string;
  kind: "value" | "perk";
  title: string;
  description?: string;
  icon?: StrapiImage | null;
  order?: number;
  region: RegionKey;
}

export interface SectionCard {
  id: number;
  title: string;
  description?: string | null;
  /** Small marker on the card — the step number, e.g. "01". */
  badge?: string | null;
  image?: StrapiImage | null;
}

export interface Section {
  id: number;
  documentId: string;
  /** Stable identifier the page looks the section up by, e.g. "why-benefits". */
  key: string;
  eyebrow?: string | null;
  title: string;
  description?: string | null;
  bullets?: string[] | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  image?: StrapiImage | null;
  cards?: SectionCard[] | null;
  order?: number;
  region: RegionKey;
}

export interface Client {
  id: number;
  documentId: string;
  name: string;
  logo?: StrapiImage | null;
  region: RegionKey;
  order?: number;
  website?: string;
}

class StrapiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly endpoint: string,
  ) {
    super(message);
    this.name = "StrapiError";
  }
}

async function strapiFetch<T>(
  endpoint: string,
  params: Record<string, string> = {},
): Promise<StrapiResponse<T>> {
  // Internal origin: this call is made by the server, never the browser.
  const url = new URL(`/api/${endpoint}`, STRAPI_INTERNAL_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(STRAPI_TOKEN ? { Authorization: `Bearer ${STRAPI_TOKEN}` } : {}),
    },
    // Content is rebuilt on demand; Strapi webhooks can revalidate on publish.
    next: { revalidate: 60, tags: [endpoint] },
  });

  if (!res.ok) {
    throw new StrapiError(
      `Strapi request failed: ${res.status} ${res.statusText}`,
      res.status,
      endpoint,
    );
  }

  return res.json();
}

/**
 * True while `next build` is generating pages.
 *
 * Next sets this itself, and it is the only reliable way to tell a build-time
 * render from a runtime revalidation — which want opposite failure behaviour,
 * see `onReadFailure` below.
 */
const IS_BUILD = process.env.NEXT_PHASE === "phase-production-build";

/**
 * Decides what a failed CMS read means, and either swallows it or rethrows.
 *
 * Two very different things arrive here:
 *
 *  - **The content type does not exist yet** (404). Legitimate during setup, and
 *    an empty section is the correct rendering. Swallow it.
 *
 *  - **Strapi is unreachable, timing out, erroring, or rejecting our token.**
 *    The content exists; we simply could not read it. Returning [] here is a
 *    lie, and an expensive one: on 4 Aug a short CMS outage cached a hollowed-out
 *    site — the homepage fell from 119,798 bytes to 62,990 and /blog from 3 posts
 *    to none, while every page still returned 200 and nothing logged an error.
 *    It self-healed only because traffic kept triggering revalidation.
 *
 * Rethrowing makes the render fail, which is what we want: Next discards a
 * revalidation that throws and keeps serving the last good page until the CMS
 * answers again. Stale content beats invented emptiness.
 *
 * During `next build` there is no previous page to fall back to and nothing is
 * being served yet, so a throw would only break the deploy. There we still
 * degrade to empty — the historical behaviour, now scoped to the one phase
 * where it is right.
 */
function onReadFailure(error: unknown, context: string): void {
  const status = error instanceof StrapiError ? error.status : 0;
  // 404 is the one status that genuinely means "there is no such content".
  const contentAbsent = status === 404;

  if (!IS_BUILD && !contentAbsent) throw error;

  // Logged unconditionally, not just in development: when this fires in
  // production it means a page rendered with content missing, which is exactly
  // the silent failure that went unnoticed for the whole of the 4 Aug outage.
  console.warn(
    `[strapi] ${context} unavailable${IS_BUILD ? " during build" : ""}:`,
    error instanceof Error ? error.message : error,
  );
}

/**
 * Fetches a collection filtered to one region.
 *
 * Renders empty when the content type does not exist yet; propagates a genuine
 * CMS failure so the previous good page is kept. See `onReadFailure`.
 */
async function fetchByRegion<T>(
  endpoint: string,
  region: RegionKey,
  extraParams: Record<string, string> = {},
): Promise<T[]> {
  try {
    const { data } = await strapiFetch<T[]>(endpoint, {
      "filters[region][$eq]": region,
      populate: "*",
      sort: "createdAt:desc",
      ...extraParams,
    });
    // `extraParams.sort` overrides the default above when a collection has an
    // explicit `order` field — see getServices/getFaqs/getClients.
    return Array.isArray(data) ? data : [];
  } catch (error) {
    onReadFailure(error, `${endpoint} (region=${region})`);
    return [];
  }
}

/**
 * Fetches a collection for one region, falling back to `global` when the region
 * has none of its own.
 *
 * Used for content that is company-wide in practice — job openings, employee
 * perks, partner benefits. Beacon hires and partners across the GCC, so a
 * vacancy listed once should appear on every regional careers page rather than
 * leaving /ae/careers and /sa/careers empty.
 *
 * A region that later adds its own entries takes precedence automatically:
 * the fallback only fires when the region returns nothing.
 */
async function fetchByRegionOrGlobal<T>(
  endpoint: string,
  region: RegionKey,
  extraParams: Record<string, string> = {},
): Promise<T[]> {
  const own = await fetchByRegion<T>(endpoint, region, extraParams);
  if (own.length > 0 || region === "global") return own;
  return fetchByRegion<T>(endpoint, "global", extraParams);
}

/**
 * Collections with an editor-controlled `order` field are sorted by it, so the
 * CMS controls display order. Without this they came back newest-first, which
 * reversed the legacy running order (Digital Marketing ahead of Business
 * Incorporation, `shami` ahead of logo1).
 */
export const getServices = (region: RegionKey) =>
  fetchByRegion<Service>("services", region, { sort: "order:asc" });

export const getFaqs = (region: RegionKey) =>
  fetchByRegion<Faq>("faqs", region, { sort: "order:asc" });

/** Posts stay newest-first — that is the right default for a blog. */
export const getPosts = (region: RegionKey) => fetchByRegion<Post>("posts", region);

/**
 * Every post, regardless of region.
 *
 * The global blog acts as the hub: it lists all articles and links each one to
 * its own regional URL, so a Saudi post has exactly one canonical address
 * (/sa/blog/...) rather than appearing at two. Regional blogs use getPosts and
 * show only their own.
 */
export async function getAllPosts(): Promise<Post[]> {
  try {
    const { data } = await strapiFetch<Post[]>("posts", {
      populate: "*",
      "pagination[pageSize]": "100",
      sort: "createdAt:desc",
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    onReadFailure(error, "posts (all regions)");
    return [];
  }
}

/** The URL a post lives at, derived from its own region. */
export function postPath(post: Pick<Post, "slug" | "region">): string {
  const base = post.region === "global" ? "" : `/${post.region}`;
  return `${base}/blog/${post.slug}`;
}

export const getPages = (region: RegionKey) => fetchByRegion<Page>("pages", region);

export const getClients = (region: RegionKey) =>
  fetchByRegion<Client>("clients", region, { sort: "order:asc" });

export const getPartnerBenefits = (region: RegionKey) =>
  fetchByRegionOrGlobal<PartnerBenefit>("partner-benefits", region, { sort: "order:asc" });

export const getJobs = (region: RegionKey) =>
  fetchByRegionOrGlobal<Job>("jobs", region, { sort: "order:asc" });

export const getStats = (region: RegionKey) =>
  fetchByRegion<Stat>("stats", region, { sort: "order:asc" });

export const getTestimonials = (region: RegionKey) =>
  fetchByRegion<Testimonial>("testimonials", region, { sort: "order:asc" });

/**
 * Cannot use fetchByRegion: its `populate=*` only reaches one level, which
 * returns the cards but drops the image inside each one. The nested populate
 * below is what makes card images come back.
 */
async function fetchSections(region: RegionKey): Promise<Section[]> {
  try {
    const { data } = await strapiFetch<Section[]>("sections", {
      "filters[region][$eq]": region,
      "populate[image]": "true",
      "populate[cards][populate][image]": "true",
      sort: "order:asc",
      "pagination[pageSize]": "100",
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    onReadFailure(error, `sections (region=${region})`);
    return [];
  }
}

/**
 * Keyed page sections for one region, with global as the base layer.
 *
 * The fallback is per key, not all-or-nothing: a region inherits every global
 * section and overrides only the keys it defines itself. Most bands — the FAQ
 * heading, the clients strip, "Why Beacon" — are worded identically everywhere,
 * so this means seeding them once against global rather than three times and
 * keeping them in step thereafter.
 *
 * Region-only sections do not leak, because leaking requires a global row with
 * that key and there isn't one: /ae's jurisdiction and places blocks, and /sa's
 * investment panel and city cards, exist for one region each.
 */
export async function getSections(region: RegionKey): Promise<Section[]> {
  if (region === "global") return fetchSections("global");

  const [own, global] = await Promise.all([
    fetchSections(region),
    fetchSections("global"),
  ]);

  const ownKeys = new Set(own.map((s) => s.key));
  const merged = [...own, ...global.filter((s) => !ownKeys.has(s.key))];

  // Re-sort: the two lists were each ordered, but concatenating them is not.
  return merged.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** Looks one section out of a fetched list; undefined when the region has none. */
export function sectionByKey(
  sections: Section[],
  key: string,
): Section | undefined {
  return sections.find((s) => s.key === key);
}

/** Offices are company-wide, so this bypasses the region filter. */
export async function getOffices(): Promise<Office[]> {
  try {
    const { data } = await strapiFetch<Office[]>("offices", {
      sort: "order:asc",
      "pagination[pageSize]": "100",
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    onReadFailure(error, "offices");
    return [];
  }
}

/**
 * URL slug for an office, derived from its city.
 *
 * Cities are stored inconsistently ("JEDDAH", "Riyadh", "DUBAI"), so the slug
 * has to normalise rather than trust the stored casing — otherwise the same
 * office would be reachable at two different URLs depending on how it was
 * typed, which is a duplicate-content problem of our own making.
 */
export function officeSlug(office: Pick<Office, "city">): string {
  return office.city
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Single type — returns null when not created yet so callers can fall back. */
export async function getSiteSettings(): Promise<SiteSettings | null> {
  try {
    const { data } = await strapiFetch<SiteSettings>("site-setting", { populate: "*" });
    return data ?? null;
  } catch (error) {
    onReadFailure(error, "site-setting");
    return null;
  }
}

export const getCareerHighlights = (region: RegionKey) =>
  fetchByRegionOrGlobal<CareerHighlight>("career-highlights", region, { sort: "order:asc" });

/** One homepage entry per region; returns null so the caller can fall back. */
export async function getHomepage(region: RegionKey): Promise<Homepage | null> {
  const entries = await fetchByRegion<Homepage>("homepages", region);
  return entries[0] ?? null;
}

export async function getPostBySlug(
  region: RegionKey,
  slug: string,
): Promise<Post | null> {
  const posts = await fetchByRegion<Post>("posts", region, {
    "filters[slug][$eq]": slug,
  });
  return posts[0] ?? null;
}

export async function getPageBySlug(
  region: RegionKey,
  slug: string,
): Promise<Page | null> {
  const pages = await fetchByRegion<Page>("pages", region, {
    "filters[slug][$eq]": slug,
  });
  return pages[0] ?? null;
}

/** Absolute URL for a Strapi media asset (uploads are served relative). */
export function mediaUrl(image?: StrapiImage | null): string | null {
  if (!image?.url) return null;
  return image.url.startsWith("http") ? image.url : `${STRAPI_URL}${image.url}`;
}

export { STRAPI_URL, STRAPI_INTERNAL_URL, StrapiError };
