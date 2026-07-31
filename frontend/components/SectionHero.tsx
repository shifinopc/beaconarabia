import Image from "next/image";
import styles from "@/styles/sections.module.css";
import { mediaUrl, type Section } from "@/lib/strapi";
import CtaButton from "./CtaButton";

/**
 * Page hero driven by a Section — background photo, headline, standfirst, CTA.
 *
 * `priority` because this is the LCP element on the pages that use it.
 */
export default function SectionHero({ section }: { section: Section }) {
  const src = mediaUrl(section.image);

  return (
    <section className={styles.hero}>
      {src && (
        <Image
          src={src}
          alt={section.image?.alternativeText ?? ""}
          width={1920}
          height={800}
          sizes="100vw"
          priority
        />
      )}
      <div className={styles.heroScrim} />
      <h1 className={styles.heroTitle}>{section.title}</h1>
      {section.description && <p className={styles.heroBody}>{section.description}</p>}
      {section.ctaHref && section.ctaLabel && (
        <div style={{ marginTop: 12, alignSelf: "flex-start" }}>
          <CtaButton content={section.ctaLabel} href={section.ctaHref} />
        </div>
      )}
    </section>
  );
}
