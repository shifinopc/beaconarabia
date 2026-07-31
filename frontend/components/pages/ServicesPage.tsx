import Image from "next/image";
import styles from "@/styles/servicesPage.module.css";
import type { Region } from "@/lib/regions";
import {
  getFaqs,
  getSections,
  getServices,
  getTestimonials,
  mediaUrl,
  sectionByKey,
} from "@/lib/strapi";
import PageShell from "../PageShell";
import CtaButton from "../CtaButton";
import Faq from "../Faq";
import Testimonials from "../Testimonials";
import ContactCta from "../ContactCta";

/** "Why Choose Us?" cards — structural copy, hardcoded in the original too. */
const SELLING_CARDS = [
  {
    img: "/NewSvgs/SVG7/G1.svg",
    heading: "Expert advice",
    description:
      "A business should follow strict compliance with the local regulations and laws. With expert advice, we guide you through aspects like licensing, tax regulations, business models, etc. to make informed decisions.",
  },
  {
    img: "/NewSvgs/SVG7/G2.svg",
    heading: "Ease of Access",
    description:
      "To grow amidst the thriving business community, having a powerful network is the key. We help you grow networks and connections that can contribute greatly to your business and help you establish a strong business presence.",
  },
  {
    img: "/NewSvgs/SVG7/G3.svg",
    heading: "Save on Costs",
    description:
      "With our team, you can relieve yourself from the time-consuming processes such as hectic paperwork, research, meetings or legal challenges, while we manage everything for you, thereby saving on costs and time.",
  },
  {
    img: "/NewSvgs/SVG7/G4.svg",
    heading: "In-depth Market research",
    description:
      "By leveraging the expertise of business consultants, you can get valuable market insights to back your business decision-making. Our comprehensive market research helps you make the most out of your venture.",
  },
];

/**
 * Services page.
 *
 * Ported from bg-Beacon/src/app/pages/Services/page.js. Five sections in order:
 *   1. heading + service cards with the hover overlay listing sub-services
 *   2. "Strategic Excellence to Scale Your Business" — image + copy + CTA
 *   3. "Why Choose Us?" — four selling cards
 *   4. "Let's Unlock Your Business Formula" — copy + CTA + illustration
 *   5. FAQ
 *
 * The service list and the overlay `details` come from Strapi; the legacy page
 * hardcoded them a second time (the homepage had its own copy of the same six).
 */
export default async function ServicesPage({ region }: { region: Region }) {
  const [services, faqs, testimonials, sections] = await Promise.all([
    getServices(region.strapiValue),
    getFaqs(region.strapiValue),
    getTestimonials(region.strapiValue),
    getSections(region.strapiValue),
  ]);

  // Region-specific headings and selling cards. The UAE site ran an entirely
  // different set of section headings here; falling back keeps global as-is.
  const heroTitle =
    sectionByKey(sections, "services-hero")?.title ??
    "Everything Your Business Needs to Thrive";
  const base = region.segment ? `/${region.segment}` : "";
  const strategy = sectionByKey(sections, "services-strategy");
  const strategyTitle =
    strategy?.title ?? "Strategic Excellence to Scale Your Business";
  // Saudi points this CTA at Why Saudi and labels it differently.
  const strategyBody =
    strategy?.description ??
    "Being your premium partner for all your business requirements, we offer a myriad of professional solutions woven to suit your expectations. Whether you are an entrepreneur searching for assistance to set up a business in GCC, or need help with financial, technological, digital transformation, or business consulting solutions, we’re here to resolve them. Our experts understand the local and global market, and the regulations to ensure your business can thrive well in the dynamic world through comprehensive services to drive business success.";
  const strategyCtaLabel = strategy?.ctaLabel ?? "Know More";
  const strategyCtaHref = strategy?.ctaHref ?? `${base}/about`;
  const formulaTitle =
    sectionByKey(sections, "services-formula")?.title ??
    "Let’s Unlock Your Business Formula";
  const servicesContact = sectionByKey(sections, "services-contact");
  const selling = sectionByKey(sections, "services-selling");
  const sellingTitle = selling?.title ?? "Why Choose Us?";
  const sellingCards = selling?.cards?.length
    ? selling.cards.map((c) => ({
        img: mediaUrl(c.image) ?? "",
        heading: c.title,
        description: c.description ?? "",
      }))
    : SELLING_CARDS;

  return (
    <PageShell region={region}>
      <div className={styles.servicePageMainContainer}>
        <h1 className="businessDesc">{heroTitle}</h1>
        <h1 className={`${styles.mBusinessDesc1} mBusinessDesc`}>{heroTitle}</h1>

        <div className={`${styles.servicePageMCardMainContainer} cardMainContainer`}>
          {services.map((service) => {
            const icon = mediaUrl(service.icon);
            const details = (service.details ?? []) as string[];

            return (
              <div
                className={`${styles.cardContainer} cardContainer`}
                key={service.documentId}
              >
                <div className={`${styles.imgContainer} imgContainer`}>
                  {icon && (
                    <Image
                      src={icon}
                      width={70}
                      height={70}
                      alt={service.icon?.alternativeText ?? service.title}
                      unoptimized
                    />
                  )}
                </div>
                <div className="servicesHeadingContainer">
                  <h3 className="servicesHeading">{service.title}</h3>
                </div>
                <div className={`${styles.servicesDescContainer} servicesDescContainer`}>
                  <p className="servicesDesc">{service.summary}</p>
                </div>

                {/* Revealed on hover — the sub-services under this offering. */}
                <div
                  className={`${styles.sPagecardContainerOverlay} cardContainerOverlay`}
                >
                  <h2>{service.title}</h2>
                  <div className={styles.overLayDesc}>
                    {details.map((detail) => (
                      <p key={detail}>{detail}</p>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.servicesPageContainer2}>
          <div className={styles.servicePageImageContainer2}>
            <Image
              src="/ServicesPage/aboutImage.webp"
              width={576}
              height={540}
              alt=""
              sizes="(max-width: 768px) 100vw, 576px"
              style={{ width: "100%", height: "auto" }}
              quality={100}
              unoptimized
            />
          </div>
          <div className={styles.container2Contents}>
            <h2 className="businessDesc">{strategyTitle}</h2>
            <h2 className={styles.servicePagecontainer2MobileHeading}>{strategyTitle}</h2>
            <p>
              Being your premium partner for all your business requirements, we offer a
              myriad of professional solutions woven to suit your expectations. Whether
              you are an entrepreneur searching for assistance to set up a business in
              GCC, or need help with financial, technological, digital transformation,
              or business consulting solutions, we&lsquo;re here to resolve them. Our
              experts understand the local and global market, and the regulations to
              ensure your business can thrive well in the dynamic world through
              comprehensive services to drive business success.
            </p>
            <div className={styles.cont2Button}>
              <CtaButton content={strategyCtaLabel} href={strategyCtaHref} />
            </div>
          </div>
        </div>

        <div className={styles.container3}>
          <h2 className="businessDesc">{sellingTitle}</h2>
          <h2 className={styles.servicePagecontainer2MobileHeading}>{sellingTitle}</h2>
          <div className={styles.container3SellingCard}>
            {sellingCards.map((card) => (
              <div className={styles.sellingCards} key={card.heading}>
                <div className={styles.sellingImageContainer}>
                  <Image
                    src={card.img}
                    width={80}
                    height={80}
                    alt=""
                    sizes="80px"
                    style={{ width: "100%", height: "auto" }}
                    unoptimized
                  />
                </div>
                <div className={styles.container3Contents}>
                  <h3 className="servicesHeading">{card.heading}</h3>
                  <p className="servicesDesc">{card.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.container4}>
          <div className={styles.background} />
          <div className={styles.container4Contents}>
            <h2 className="businessDesc">{formulaTitle}</h2>
            <h2 className={styles.servicePagecontainer2MobileHeading}>{formulaTitle}</h2>
            <p className="servicesDesc">
              A reliable business consulting solutions provider augments your needs to
              set up your business as you prefer. We help you with everything that
              ranges from how to start a business to establishing the roots for a firm
              brand presence. Through end-to-end strategies and consulting solutions, we
              give businesses the methods to manage any technological, financial, legal,
              digital, and operational processes to let you scale your business. Our
              advisory and consulting expertise helps you to quickly adapt to the
              changes in the dynamic landscape and gain sustainable business advantage.
            </p>
            <div className={styles.cont3Button}>
              <CtaButton content="Get in Touch" href={`${base}/contact`} />
            </div>
          </div>
          <div className={styles.container4ImgContainer}>
            <Image
              // Was abBg5.svg: an <svg> wrapping one base64 raster, 1.5 MB for
              // a 506x500 picture. Re-encoded to WebP at 59 KB.
              src="/NewSvgs/Backgrounds/abBg5.webp"
              width={500}
              height={494}
              alt=""
              sizes="(max-width: 768px) 100vw, 500px"
              style={{ width: "100%", height: "auto" }}
              quality={100}
              unoptimized
            />
          </div>
        </div>

        <div className={styles.marginContainer}>
          <Testimonials
            wrapperClassName={styles.testimonialMainContainerServicePage}
            leftClassName={styles.testimonialLeftContainer}
            mobileHeadingClassName={styles.mTestimonialHeading}
            items={testimonials}
            section={sectionByKey(sections, "testimonials-heading")}
          />
        </div>

        <Faq entries={faqs} section={sectionByKey(sections, "faq-heading")} />

        {/* Only Saudi’s services page closes with a contact band; global and
            UAE end at the FAQ, so this renders only where the CMS has it. */}
        {servicesContact && <ContactCta region={region} section={servicesContact} />}
      </div>
    </PageShell>
  );
}
