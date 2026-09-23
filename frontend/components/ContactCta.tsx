import type { Region } from "@/lib/regions";
import CtaButton from "./CtaButton";

/**
 * Homepage contact block.
 *
 * Ported from bg-Beacon/src/app/components/Contact.js. This is a call-to-action
 * — heading, description and a "Let's Talk" button linking to the Contact page
 * — NOT an inline form. The enquiry form lives on /contact only.
 */
export default function ContactCta({
  region,
  section,
}: {
  region: Region;
  /** Optional `contact-cta` Section. Each regional site had its own wording. */
  section?: { title: string; description?: string | null; ctaLabel?: string | null };
}) {
  const base = region.segment ? `/${region.segment}` : "";
  const title = section?.title ?? "Have Queries? We Provide Solutions.";
  const ctaLabel = section?.ctaLabel ?? "Let’s Talk";
  /**
   * The CMS description, when the section has one.
   *
   * Both paragraphs below are the same sentence at two breakpoints, and both
   * were hardcoded — so the Saudi `contact-cta` copy an editor wrote never
   * appeared anywhere. The fallback keeps every page that has no description
   * exactly as it was.
   */
  const description =
    section?.description?.trim() ||
    "If you're seeking tailored solutions, look no further. Get in touch with us today for expert business consultancy services across the GCC.";

  return (
    <div className="contactMainContainer">
      <div className="contactContainer">
        <div className="contactHeadingContainer">
          <h2 className="contactHeading">{title}</h2>
        </div>
        <div className="contactDescContainer">
          {/* Desktop and mobile variants of one paragraph; CSS shows one. */}
          <p className="contactDesc">{description}</p>
          <p className="mContactDesc">{description}</p>
        </div>
        <div>
          {/* Plain apostrophe: this is a string prop, not JSX text, so an
              HTML entity here would render literally. */}
          <CtaButton content={ctaLabel} href={`${base}/contact`} />
        </div>
      </div>
    </div>
  );
}
