import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

/**
 * On-demand revalidation endpoint for Strapi webhooks.
 *
 * Without this, a CMS edit takes up to 60 seconds to appear (the `revalidate`
 * on our Strapi fetches) and a cached route render can outlive a dev-server
 * restart entirely — an editor publishes, sees no change, and assumes the CMS
 * is broken.
 *
 * Strapi POSTs here on publish/update/delete. We map the payload's `model` to
 * the cache tag used by lib/strapi.ts (the API endpoint name) and invalidate it.
 *
 * Note on the API: `updateTag` would give immediate read-your-own-writes, but
 * it is only callable from Server Actions. In a Route Handler the supported
 * call is `revalidateTag(tag, profile)` — the single-argument form is
 * deprecated in Next 16. We pair it with `revalidatePath` so the rendered
 * route cache is dropped too, not just the data cache.
 */

/** Strapi `model` (singular) → the tag lib/strapi.ts attaches (endpoint name). */
const MODEL_TO_TAG: Record<string, string> = {
  service: "services",
  post: "posts",
  faq: "faqs",
  page: "pages",
  client: "clients",
  homepage: "homepages",
  job: "jobs",
  "career-highlight": "career-highlights",
  stat: "stats",
  testimonial: "testimonials",
  office: "offices",
  "site-setting": "site-setting",
  section: "sections",
};

const ALL_TAGS = Object.values(MODEL_TO_TAG);

function isAuthorised(request: Request): boolean {
  const secret = process.env.REVALIDATE_SECRET;
  // With no secret configured the endpoint stays closed rather than open.
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;

  // Strapi's webhook UI also allows a plain custom header.
  return request.headers.get("x-revalidate-secret") === secret;
}

export async function POST(request: Request) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ revalidated: false, error: "unauthorised" }, { status: 401 });
  }

  let model: string | undefined;
  try {
    const body = (await request.json()) as { model?: string; event?: string };
    model = body.model;
  } catch {
    // A malformed or empty body still triggers a full refresh below.
  }

  // Media uploads and unknown models can affect any page, so refresh everything.
  const tags = model && MODEL_TO_TAG[model] ? [MODEL_TO_TAG[model]] : ALL_TAGS;

  for (const tag of tags) {
    revalidateTag(tag, "max");
  }

  // Drop the rendered route cache as well — invalidating the data tag alone
  // leaves already-rendered pages in place.
  revalidatePath("/", "layout");

  return NextResponse.json({
    revalidated: true,
    model: model ?? null,
    tags,
    at: new Date().toISOString(),
  });
}

/** Convenience for checking the endpoint is reachable and configured. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    configured: Boolean(process.env.REVALIDATE_SECRET),
    models: Object.keys(MODEL_TO_TAG),
  });
}
