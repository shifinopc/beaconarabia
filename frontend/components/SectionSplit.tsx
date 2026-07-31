import Image from "next/image";
import styles from "@/styles/sections.module.css";
import { mediaUrl, type Section } from "@/lib/strapi";
import SectionHeading from "./SectionHeading";
import CtaButton from "./CtaButton";

/**
 * A Section rendered as image beside copy, with optional bullets and a CTA.
 *
 * Serves both the homepage investment panel and the Why Saudi "Key Factors"
 * block — the same layout in the legacy source, implemented twice.
 */
export default function SectionSplit({
  section,
  reverse = false,
}: {
  section: Section;
  reverse?: boolean;
}) {
  const src = mediaUrl(section.image);
  const bullets = section.bullets ?? [];

  return (
    <section className={styles.section}>
      <div className={`${styles.split} ${reverse ? styles.splitReverse : ""}`}>
        {src && (
          <div className={styles.splitImage}>
            <Image
              src={src}
              alt={section.image?.alternativeText ?? ""}
              width={640}
              height={480}
              sizes="(max-width: 600px) 100vw, 50vw"
            />
          </div>
        )}

        <div className={styles.splitContent}>
          <SectionHeading eyebrow={section.eyebrow} title={section.title} align="left" />

          {section.description && <p className={styles.body}>{section.description}</p>}

          {bullets.length > 0 && (
            <ul className={styles.bullets}>
              {bullets.map((bullet) => (
                <li className={styles.bullet} key={bullet}>
                  <Image
                    src="/sa/factors/check.svg"
                    alt=""
                    width={20}
                    height={20}
                    className={styles.bulletMark}
                    unoptimized
                  />
                  <span className={styles.body}>{bullet}</span>
                </li>
              ))}
            </ul>
          )}

          {section.ctaHref && section.ctaLabel && (
            <CtaButton content={section.ctaLabel} href={section.ctaHref} />
          )}
        </div>
      </div>
    </section>
  );
}
