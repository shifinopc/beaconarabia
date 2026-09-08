/**
 * Mirrors a contact enquiry to the lead-tracking platform.
 *
 * Beacon was the only one of seven sites with no lead tracking, so its organic
 * traffic produced nothing measurable — 5,215 impressions and 36 clicks in
 * August that nobody could tie to an enquiry.
 *
 * Server-side on purpose, for two reasons that both rule out a browser call:
 * the endpoint returns no `Access-Control-Allow-Origin`, so a client fetch
 * could not read the response; and ad-blockers routinely block third-party
 * POSTs from the page, which would silently lose exactly the leads worth
 * counting.
 *
 * The contract this has to honour is that it changes nothing a visitor sees.
 * The enquiry is already committed to Strapi by the time this runs, so a
 * failure here costs a dashboard row, never a lead — which is why every error
 * path below ends in a warning rather than a throw.
 */

/**
 * Unset means off. The whole integration can be disabled by clearing this
 * variable in cPanel, with no deploy and no code change — worth having on a
 * host where deploying is the riskiest thing we do.
 *
 * The URL carries its own query string, e.g.
 *   https://seo.ionob.in/lead?site=beaconarabia.com&form=Contact
 *
 * Note the `form=Contact` in that query string. /api/contact also serves the
 * newsletter signup and the first-visit popup, and posting those to this URL
 * would file them as contact enquiries — inflating the count and mislabelling
 * every one of them. So the route sends contact submissions only.
 *
 * Tracking the other two is worth doing and needs one variable each, e.g.
 * LEAD_WEBHOOK_URL_NEWSLETTER with `form=Newsletter`, plus a matching branch on
 * `body.kind`. Left out here because it is a decision for whoever owns the
 * leads dashboard, not an implementation detail.
 */
const LEAD_URL = process.env.LEAD_WEBHOOK_URL;

/** Long enough for a normal round trip, short enough never to be noticed. */
const TIMEOUT_MS = 3000;

export interface LeadPayload {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  /** Which page the form was submitted from — separates /contact from /ae/contact. */
  page?: string;
}

/**
 * Fire-and-forget lead capture. Never throws, never rejects.
 *
 * Callers use `void sendLead(...)` rather than awaiting, so the visitor's
 * success response is not held up by a third-party service. That is safe here
 * because the frontend runs as a persistent Node process under Passenger: the
 * request handler returning does not tear down the pending fetch, as it would
 * in a serverless function.
 *
 * The `catch` is not decoration. An unhandled rejection from a floating promise
 * terminates the Node process, which would turn a failed webhook into an
 * outage — the opposite of what this is for. Every path resolves.
 */
export async function sendLead(payload: LeadPayload): Promise<void> {
  if (!LEAD_URL) return;

  try {
    const response = await fetch(LEAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });

    // A non-2xx is worth knowing about — a wrong site parameter or an expired
    // endpoint fails exactly like this and would otherwise be invisible.
    if (!response.ok) {
      console.warn(`[lead] webhook returned ${response.status}`);
    }
  } catch (error) {
    // Timeout, DNS failure, refused connection, malformed URL. None of these
    // are the visitor's problem, and none should reach them.
    console.warn(
      `[lead] webhook failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
