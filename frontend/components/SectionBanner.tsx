import Image from "next/image";
import styles from "@/styles/sections.module.css";
import { mediaUrl, type Section } from "@/lib/strapi";

/**
 * A Section rendered full-bleed: centred copy over a darkened photograph.
 *
 * The legacy version stacked an absolutely-positioned black div at 60% opacity
 * over the image and pushed the text to `zIndex: 10`; the scrim here is a
 * sibling with a negative z-index inside an `isolation: isolate` container, so
 * it cannot escape the section and cover anything else on the page.
 */
export default function SectionBanner({ section }: { section: Section }) {
  const src = mediaUrl(section.image);

  return (
    <section className={styles.banner}>
      {src && (
        <Image
          src={src}
          alt={section.image?.alternativeText ?? ""}
          width={2048}
          height={677}
          sizes="100vw"
        />
      )}
      <div className={styles.bannerScrim} />
      <h2 className={styles.title}>{section.title}</h2>
      {section.description && <p className={styles.body}>{section.description}</p>}
    </section>
  );
}
