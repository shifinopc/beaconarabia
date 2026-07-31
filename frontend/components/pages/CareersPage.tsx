import Image from "next/image";
import styles from "@/styles/careers.module.css";
import type { Region } from "@/lib/regions";
import { getCareerHighlights, getJobs, getSections, mediaUrl, sectionByKey } from "@/lib/strapi";
import PageShell from "../PageShell";
import JobAccordion from "../JobAccordion";
import ContactCta from "../ContactCta";

/**
 * Careers page.
 *
 * Ported from bg-Beacon/src/app/pages/Careers/page.js — hero, open positions,
 * "The Values We Live By", "easier life with Beacon", contact CTA.
 *
 * The legacy page shipped Lorem Ipsum in the values and perks descriptions and
 * left every job-detail heading empty; that filler is deliberately not carried
 * over. Titles come from the CMS with empty descriptions, so the copy can be
 * written in Strapi instead of being hardcoded placeholder text. Sections with
 * no content render nothing rather than an empty shell.
 */
export default async function CareersPage({ region }: { region: Region }) {
  const [jobs, highlights, sections] = await Promise.all([
    getJobs(region.strapiValue),
    getCareerHighlights(region.strapiValue),
    getSections(region.strapiValue),
  ]);

  const hero = sectionByKey(sections, "careers-hero");
  const heroTitle = hero?.title ?? "Come join our awesome team!";
  const positionsTitle =
    sectionByKey(sections, "careers-positions")?.title ?? "our current open positions";
  const valuesTitle =
    sectionByKey(sections, "careers-values")?.title ?? "The Values We Live By";
  const perksTitle =
    sectionByKey(sections, "careers-perks")?.title ?? "easier life with Beacon";

  const values = highlights.filter((h) => h.kind === "value");
  const perks = highlights.filter((h) => h.kind === "perk");
  const base = region.segment ? `/${region.segment}` : "";

  return (
    <PageShell region={region}>
      <div className={styles.contactUsContainer}>
        <div className={styles.Imagecontainer}>
          <h1 className="businessDesc">{heroTitle}</h1>
          <h1 className={styles.mbusinessDesc}>{heroTitle}</h1>
          <p className={styles.subHeading}>
            {hero?.description ??
              "Be a part of a dynamic group of passionate researchers, designers and developers who love creating exceptional user experiences for digital products."}
          </p>
          <div>
            <Image
              src="/Careers/HeroImage.webp"
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
        </div>

        <div className={styles.faqMainContainer}>
          <h2 className="businessDesc">{positionsTitle}</h2>
          <h2 className={styles.mbusinessDesc}>{positionsTitle}</h2>
          <JobAccordion jobs={jobs} contactHref={`${base}/contact`} />
        </div>

        {values.length > 0 && (
          <div className={styles.servicesPageContainer2}>
            <div className={styles.servicePageImageContainer2}>
              <Image
                src="/Careers/ValueImage.webp"
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
              <h2 className="businessDesc">{valuesTitle}</h2>
              <h2 className={styles.servicePagecontainer2MobileHeading}>{valuesTitle}</h2>
              <div className={styles.container2}>
                {values.map((value) => (
                  <div key={value.documentId} className={styles.container2Card}>
                    <h2 className={styles.title}>{value.title}</h2>
                    {value.description && (
                      <p className={styles.desc}>{value.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {perks.length > 0 && (
          <div className={styles.CareersContainer}>
            <h2 className="businessDesc">{perksTitle}</h2>
            <h2 className={styles.mbusinessDesc}>{perksTitle}</h2>
            <div className={styles.CardContainer}>
              {perks.map((perk) => {
                const icon = mediaUrl(perk.icon);
                return (
                  <div key={perk.documentId} className={styles.CareersCard}>
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
                    <h2 className={styles.title}>{perk.title}</h2>
                    {perk.description && <p className={styles.desc}>{perk.description}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <ContactCta region={region} section={sectionByKey(sections, "contact-cta")} />
      </div>
    </PageShell>
  );
}
