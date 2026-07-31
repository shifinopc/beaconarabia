import { z } from "zod";

/**
 * Validation for form submissions reaching /api/contact.
 *
 * Replaces the hand-rolled length caps and regex that were inline in the route.
 * The value is not that zod validates better — three simple forms don't strain
 * either approach — but that the schema is one declaration the route, the CMS
 * content type and the client can be checked against, instead of rules spread
 * through a request handler.
 *
 * Caps mirror the maxLength values on the Enquiry content type, so anything
 * that passes here is storable; a mismatch would surface as a 400 from Strapi
 * after the submission had already been accepted.
 */

/**
 * Strips control characters, which have no place in these fields and are how
 * header-injection attempts are smuggled into email. Applied before length
 * limits so a padded string can't slip through by being truncated afterwards.
 */
const cleanString = (max: number) =>
  z
    .string()
    // eslint-disable-next-line no-control-regex
    .transform((value) => value.replace(/[\x00-\x1F\x7F]/g, " ").trim())
    .refine((value) => value.length <= max, { message: `Must be ${max} characters or fewer` });

const optionalString = (max: number) =>
  cleanString(max).optional().or(z.literal("").transform(() => undefined));

export const enquirySchema = z.object({
  kind: z.enum(["contact", "newsletter", "popup"]).default("contact"),
  /**
   * The only genuinely required field. The newsletter form collects nothing
   * else, so anything stricter would have to vary by kind for no real gain —
   * an enquiry without a name is still an enquiry worth keeping.
   */
  email: cleanString(320).pipe(z.email({ message: "Please provide a valid email address." })),
  name: optionalString(200),
  phone: optionalString(60),
  subject: optionalString(300),
  message: optionalString(5000),
  region: z.enum(["global", "ae", "sa", "Global", "United Arab Emirates", "Saudi Arabia"]).optional(),
  enquiryType: optionalString(100),
  sourcePath: optionalString(300),
  /** Honeypot. Any value at all means a bot filled a field humans never see. */
  website: z.string().optional(),
  turnstileToken: z.string().optional(),
});

export type EnquiryInput = z.infer<typeof enquirySchema>;

/**
 * The forms send a human-readable region label (`Region.label`), while the CMS
 * enum stores the key. Mapping here keeps the components unchanged and the
 * stored value queryable.
 */
const REGION_KEYS: Record<string, "global" | "ae" | "sa"> = {
  global: "global",
  ae: "ae",
  sa: "sa",
  Global: "global",
  "United Arab Emirates": "ae",
  "Saudi Arabia": "sa",
};

export function regionKey(value: string | undefined): "global" | "ae" | "sa" {
  return (value && REGION_KEYS[value]) || "global";
}
