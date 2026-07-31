import styles from "@/styles/contact.module.css";
import type { Region } from "@/lib/regions";
import { getOffices, getSections, sectionByKey } from "@/lib/strapi";
import PageShell from "../PageShell";
import OfficeLocations from "../OfficeLocations";
import ContactForm from "../ContactForm";

/**
 * Contact page.
 *
 * Ported from bg-Beacon/src/app/pages/Contact/page.js: heading, the country tab
 * switcher with office cards, then the enquiry form. Structure and class names
 * match the original; offices now come from the Strapi Office content type and
 * the form lives in ContactForm so it can be reused.
 */
export default async function ContactPage({ region }: { region: Region }) {
  const [offices, sections] = await Promise.all([getOffices(), getSections(region.strapiValue)]);
  const heroTitle = sectionByKey(sections, "contact-hero")?.title ?? "Get In Touch With Us!";

  return (
    <PageShell region={region}>
      <div className={styles.contactUsContainer}>
        <h1 className="businessDesc">{heroTitle}</h1>
        <h1 className={`${styles.mBusinessDesc1} mBusinessDesc`}>{heroTitle}</h1>

        {/* Visually hidden — the design has no visible slot for a mid-page
            heading here, but the outline shouldn't jump from the H1 above
            straight to the office cards' H3s with nothing in between. */}
        <h2 className="srOnly">Our Offices</h2>
        <OfficeLocations offices={offices} />

        <div className={styles.container2}>
          <h2 className="srOnly">Send Us a Message</h2>
          <ContactForm region={region} />
        </div>
      </div>
    </PageShell>
  );
}
