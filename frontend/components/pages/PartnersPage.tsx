import Image from "next/image";
import styles from "@/styles/partners.module.css";
import contactStyles from "@/styles/contact.module.css";
import type { Region } from "@/lib/regions";
import { getFaqs, getPartnerBenefits, getSections, mediaUrl, sectionByKey } from "@/lib/strapi";
import PageShell from "../PageShell";
import PartnerCta from "../PartnerCta";
import ContactForm from "../ContactForm";
import Faq from "../Faq";
import ContactCta from "../ContactCta";

const INTRO =
  "Founded in 2022, Beacon Global comprises a team of passionate accountants, auditors, and financial analysts. With a complete understanding of the need for a reliable auditing and accounting firm that offers excellent services to clients, we deliver the leading business consulting services in Saudi Arabia. Right from its inception, our team of consultants has been adept at building a good industry reputation with remarkable services to the clients. With the growth of the goodwill of the firm, we have extended the roots to business consultancy, tax advisory, accounting, audit and regulatory services, and digital marketing, with offices across UAE, India, and KSA. We are committed to offering business incorporation services to clients with an emphasis on the principles of professionalism, integrity, and reliability. We are grateful for the recognition gifted by the clients who helped us navigate the complexities of tax, auditing, and regulatory compliance. Our team is dedicated to delivering unparalleled service and value to businesses with strong support of partners, clients, and other stakeholders through constructive relationships.";

/**
 * Partners page.
 *
 * Ported from bg-Beacon/src/app/pages/Partners/page.js. Sections in order:
 *   1. hero — heading, image, intro copy, "PARTNER WITH US"
 *   2. "Being a partner has its benefits" — six benefit cards
 *   3. partner application form (submits "Become a partner")
 *   4. green banner with a second "PARTNER WITH US"
 *   5. FAQ
 *   6. contact CTA
 *
 * Two bugs from the original are not carried over: the mobile heading on the
 * benefits section read "easier life with Beacon" (copy-pasted from Careers),
 * and the six benefit cards had only three distinct titles, each duplicated,
 * with Lorem Ipsum descriptions. Benefits now come from the CMS.
 *
 * The legacy file also carried a commented-out "process & approach" accordion
 * and an "Our partners" logo scroller; neither rendered, so neither is ported.
 */
export default async function PartnersPage({ region }: { region: Region }) {
  const [benefits, faqs, sections] = await Promise.all([
    getPartnerBenefits(region.strapiValue),
    getFaqs(region.strapiValue),
    getSections(region.strapiValue),
  ]);

  const heroSection = sectionByKey(sections, "partners-hero");
  const benefitsSection = sectionByKey(sections, "partners-benefits");
  const bannerSection = sectionByKey(sections, "partners-banner");
  const heroTitle = heroSection?.title ?? "Collaboration for a Better Tomorrow";
  const intro = heroSection?.description ?? INTRO;

  return (
    <PageShell region={region}>
      <div className={styles.contactUsContainer}>
        <div className={styles.Imagecontainer}>
          <h1 className="businessDesc">{heroTitle}</h1>
          <h1 className={styles.mbusinessDesc}>{heroTitle}</h1>

          <div>
            <Image
              src="/Partners/1.webp"
              width={1212}
              height={600}
              alt=""
              className={styles.aboutHeroImage}
              sizes="100vw"
              style={{ width: "100%", height: "auto" }}
              quality={100}
              priority
              unoptimized
            />
          </div>

          <p className={styles.subHeading}>{intro}</p>

          <PartnerCta region={region} />
        </div>

        {benefits.length > 0 && (
          <div className={styles.CareersContainer}>
            <h2 className="businessDesc">{benefitsSection?.title ?? "Being a partner has its benefits"}</h2>
            {/* The original repeated the Careers heading here by mistake. */}
            <h2 className={styles.mbusinessDesc}>{benefitsSection?.title ?? "Being a partner has its benefits"}</h2>

            <div className={styles.CardContainer}>
              {benefits.map((benefit) => {
                const icon = mediaUrl(benefit.icon);
                return (
                  <div key={benefit.documentId} className={styles.CareersCard}>
                    {icon && (
                      <div className={styles.iconContainer}>
                        <Image
                          src={icon}
                          width={40}
                          height={40}
                          alt=""
                          className={styles.icon}
                          sizes="40px"
                          style={{ width: "100%", height: "auto" }}
                          unoptimized
                        />
                      </div>
                    )}
                    <h2 className={styles.title}>{benefit.title}</h2>
                    {benefit.description && (
                      <p className={styles.desc}>{benefit.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className={contactStyles.container2}>
          <ContactForm
            region={region}
            submitLabel="Become a partner"
            enquiryType="Partner application"
          />
        </div>

        <div className={styles.PartnersGreenbanner}>
          <div className={styles.LeftGreenBanner}>
            <h2 className={styles.bannerHeading}>
              {bannerSection?.title ?? "Let’s turn your idea into reality"}
            </h2>
            <p className={styles.bannersubHeading}>
              {bannerSection?.description ??
                "Be a part of a dynamic group of passionate researchers, designers"}
            </p>
          </div>
          <div className={styles.RightGreenBanner}>
            <PartnerCta region={region} variant="onGreen" />
          </div>
        </div>

        <Faq entries={faqs} section={sectionByKey(sections, "faq-heading")} />
        <ContactCta region={region} section={sectionByKey(sections, "contact-cta")} />
      </div>
    </PageShell>
  );
}
