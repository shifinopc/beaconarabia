import Image from "next/image";
import Link from "next/link";
import styles from "@/styles/aboutus.module.css";
import type { Region } from "@/lib/regions";
import { getPageBySlug, getSections, getStats, mediaUrl, sectionByKey } from "@/lib/strapi";
import PageShell from "../PageShell";
import ExploreButton from "../ExploreButton";
import Stats from "../Stats";
import ContactCta from "../ContactCta";

/** "Let Beacon Lead Your Dream Business Setup..." cards. */
const REASONS = [
  {
    img: "/NewSvgs/SVG4/Ggroup1.svg",
    heading: "Right in Time",
    description:
      "With Beacon, you’ll never have to waste time navigating the business process to make it right. We make the business setup in Saudi Arabia and UAE time-efficient and easier than ever.",
  },
  {
    img: "/NewSvgs/SVG4/Ggroup2.svg",
    heading: "Financially Secure",
    description:
      "Setting up a business can prove to be risky if you have no professional financial assistance. Our consultants let you minimise the potential financial risks through financial consultation.",
  },
  {
    img: "/NewSvgs/SVG4/Ggroup3.svg",
    heading: "Reliable Partner",
    description:
      "With our support that guides your business right from the ideation to the final setup, we let our presence lead you through each stage. As your strategic advisor, Beacon stands out to solve your business setup concerns in no time.",
  },
];

/** Core values. */
const CORE_VALUES = [
  {
    img: "/NewSvgs/SVG7/Group1.svg",
    heading: "Professionalism",
    description:
      "We perform business with high standards of integrity,ethics and professionalism. Our professionals keep the interactions with the clients fair and lawful.",
  },
  {
    img: "/NewSvgs/SVG7/Group2.svg",
    heading: "Innovation",
    description:
      "Our business initiatives focus on keeping up the standards and expectations of the clients with sustainability, innovative practices and strategic principles.",
  },
  {
    img: "/NewSvgs/SVG7/Group3.svg",
    heading: "Synergy",
    description:
      "Our team maintains collaboration and inclusiveness while creating a strong synergy between the individual talents and what the client demands.",
  },
  {
    img: "/NewSvgs/SVG7/Group4.svg",
    heading: "Passion",
    description:
      "Growing beyond a service provider, we provide timely support and resolve concerns through constructive discussions that generate special value outcomes.",
  },
];

const INTRO =
  "At Beacon Global, we are a team of dedicated professionals, including accountants, auditors, and financial analysts, committed to delivering exceptional business consultancy services. Recognizing the growing demand for reliable auditing and accounting services, we have established a strong reputation in the industry. Our services go beyond traditional auditing and accounting to encompass business consultancy, tax advisory, regulatory compliance, and digital marketing. With a presence across GCC, we uphold values of professionalism, integrity, and reliability in all our endeavors. Specializing in business incorporation services, we guide our clients through tax, auditing, and regulatory complexities with confidence. Our ultimate goal is to provide unmatched service and value, built on enduring partnerships and positive client relationships.";

/**
 * About page.
 *
 * Ported from bg-Beacon/src/app/pages/About/page.js. Sections in order:
 *   1. heading + hero image + intro copy + "Our services" CTA
 *   2. Stats (solid green here — the About page passes useBackgroundImage=false)
 *   3. "Let Beacon Lead Your Dream Business Setup..." — three cards
 *   4. Mission / Vision
 *   5. Core Values — four cards
 *   6. Contact CTA
 *
 * Every heading and card comes from `about-*` Sections, so each region gets its
 * own. The UAE and Saudi sites had a wholly different About page — different
 * headline, different cards, a third "Our Values" pillar and six reasons rather
 * than four core values — and consolidating onto one layout had flattened all of
 * it onto global's copy. The layout is still shared; only the content varies.
 *
 * The hardcoded arrays below are the fallback for when a region has no sections
 * (or Strapi is unreachable), and are what global's own sections were seeded
 * from — so this page renders identically with or without the CMS.
 *
 * The intro paragraph falls back to the legacy copy but is overridable from the
 * Page record with slug "about", so marketing can edit it without a deploy.
 * `hidetext` / `visibletext` are the design's desktop/mobile variants of the
 * same paragraph — both rendered, CSS decides which shows.
 */
export default async function AboutPage({ region }: { region: Region }) {
  const [page, stats, sections] = await Promise.all([
    getPageBySlug(region.strapiValue, "about"),
    getStats(region.strapiValue),
    getSections(region.strapiValue),
  ]);

  const hero = sectionByKey(sections, "about-hero");
  const cardsSection = sectionByKey(sections, "about-cards");
  const pillars = sectionByKey(sections, "about-pillars");
  const values = sectionByKey(sections, "about-values");

  const intro = page?.body?.trim() ? page.body : (hero?.description?.trim() ?? INTRO);
  const base = region.segment ? `/${region.segment}` : "";

  const heroTitle =
    hero?.title ?? "Your Partner to Unleash the Odyssey of Business Success";
  const reasons =
    cardsSection?.cards?.length
      ? cardsSection.cards.map((c) => ({
          img: mediaUrl(c.image) ?? "",
          heading: c.title,
          description: c.description ?? "",
        }))
      : REASONS;
  const coreValues =
    values?.cards?.length
      ? values.cards.map((c) => ({
          img: mediaUrl(c.image) ?? "",
          heading: c.title,
          description: c.description ?? "",
        }))
      : CORE_VALUES;

  const cardsTitle =
    cardsSection?.title ??
    "Let Beacon Lead Your Dream Business Setup to The Path Of Success!";
  const valuesTitle = values?.title ?? "Core Values";

  /**
   * Mission / Vision, and on the regional sites a third "Our Values" pillar.
   * The legacy KSA and UAE pages rendered three side by side where global
   * renders two, so the count comes from the data rather than the markup.
   */
  const pillarCards = pillars?.cards?.length
    ? pillars.cards
    : [
        {
          id: -1,
          title: "Our Mission",
          description:
            "To evolve into the most trusted partner in business incorporation and consulting services, thereby laying a benchmark through the reputation from the best-in-market business results",
        },
        {
          id: -2,
          title: "Our Vision",
          description:
            "To future-proof businesses with fruitful collaborations and partnerships, which help businesses to multiply their growth through the quality and integrity of the services we offer.",
        },
      ];

  return (
    <PageShell region={region}>
      <div className={styles.aboutUsMainContainer}>
        <h1 className="businessDesc">{heroTitle}</h1>
        <h1 className={`${styles.mBusinessDesc1} mBusinessDesc`}>{heroTitle}</h1>

        <div className={styles.aboutUsHeroContainer}>
          <div>
            <Image
              src="/AboutUsPage/aboutPage1.webp"
              width={1212}
              height={350}
              alt=""
              className={styles.aboutHeroImage}
              sizes="100vw"
              style={{ width: "100%", height: "auto" }}
              quality={100}
              priority
              unoptimized
            />
          </div>

          <p className={styles.hidetext}>{intro}</p>
          <p className={styles.visibletext}>{intro}</p>

          <Link href={`${base}/services`}>
            <ExploreButton
              label="Our services"
              className={styles.servicesButton}
              btnClassName={styles.btn}
            />
          </Link>
        </div>

        {/* Solid green banner on this page, not the skyline image. */}
        <Stats useBackgroundImage={false} stats={stats} />

        <div className={styles.aboutUsContainer2}>
          <h2 className="businessDesc">{cardsTitle}</h2>
          <h2 className={`${styles.mBusinessDesc1} mBusinessDesc`}>{cardsTitle}</h2>

          <div className={`${styles.aboutCardMainContainer} cardMainContainer`}>
            {reasons.map((reason) => (
              <div
                className={`${styles.aboutCardContainer} cardContainer`}
                key={reason.heading}
              >
                <div className={`${styles.imgContainerAbout} imgContainer`}>
                  <Image
                    src={reason.img}
                    width={70}
                    height={70}
                    alt=""
                    quality={100}
                    unoptimized
                  />
                </div>
                <div className="servicesHeadingContainer">
                  <h3 className="servicesHeading">{reason.heading}</h3>
                </div>
                <div className={styles.servicesDescContainer}>
                  <p className="servicesDesc">{reason.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.aboutUscontainer3}>
          <div className={styles.vissionMissionContent}>
            {pillarCards.map((pillar, i) => (
              <div
                key={pillar.id ?? pillar.title}
                className={i === 0 ? styles.mission : styles.vission}
              >
                <h2>{pillar.title}</h2>
                <p>{pillar.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.aboutUscontainer4}>
          <h2 className="businessDesc">{valuesTitle}</h2>
          <h2 className={`${styles.mBusinessDesc1} mBusinessDesc`}>{valuesTitle}</h2>

          <div className={styles.coreValueCard}>
            {coreValues.map((value) => (
              <div className={styles.coreValueCards} key={value.heading}>
                <div className={styles.cvImgContainer}>
                  <Image
                    src={value.img}
                    width={50}
                    height={50}
                    alt=""
                    quality={100}
                    unoptimized
                  />
                </div>
                <div className={styles.cvContent}>
                  <h3>{value.heading}</h3>
                  <p>{value.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.contactCont}>
          <ContactCta region={region} section={sectionByKey(sections, "contact-cta")} />
        </div>
      </div>
    </PageShell>
  );
}
