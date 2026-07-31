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

  return (
    <div className="contactMainContainer">
      <div className="contactContainer">
        <div className="contactHeadingContainer">
          <h2 className="contactHeading">{title}</h2>
        </div>
        <div className="contactDescContainer">
          <p className="contactDesc">
            If you&apos;re seeking tailored solutions, look no further. Get in touch with{" "}
            <br /> us today for expert business consultancy services across the GCC.
          </p>
          <p className="mContactDesc">
            If you&apos;re seeking tailored solutions, look no further. Get in touch with us
            today for expert business consultancy services across the GCC.
          </p>
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
