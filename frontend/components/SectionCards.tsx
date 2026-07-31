import Image from "next/image";
import styles from "@/styles/sections.module.css";
import { mediaUrl, type Section } from "@/lib/strapi";
import SectionHeading from "./SectionHeading";

/**
 * A Section rendered as a card grid.
 *
 * Two shapes, matching the two the Saudi site used:
 * - `stacked` — image above the copy (Benefits, Vision 2030, Projects)
 * - `overlay` — copy over a darkened photo with a numbered badge (KSA cities)
 *
 * The legacy Benefits and Projects rows were horizontal carousels driven by
 * arrow buttons and a `translateX` on every card. They are grids here: the
 * carousel hid most of the cards behind an interaction, which cost both
 * usability and the chance of that copy being indexed.
 */
export default function SectionCards({
  section,
  variant = "stacked",
}: {
  section: Section;
  variant?: "stacked" | "overlay";
}) {
  const cards = section.cards ?? [];
  if (!cards.length) return null;

  const overlay = variant === "overlay";

  return (
    <section className={styles.section}>
      <SectionHeading eyebrow={section.eyebrow} title={section.title} />

      <div className={overlay ? styles.overlayGrid : styles.grid}>
        {cards.map((card) => {
          const src = mediaUrl(card.image);

          if (overlay) {
            return (
              <article className={styles.overlayCard} key={card.id}>
                {src && (
                  <Image
                    src={src}
                    alt={card.image?.alternativeText ?? ""}
                    width={520}
                    height={520}
                    sizes="(max-width: 600px) 100vw, 33vw"
                  />
                )}
                <div className={styles.overlayScrim} />
                {card.badge && <span className={styles.overlayBadge}>{card.badge}</span>}
                <h3 className={styles.cardTitle}>{card.title}</h3>
                {card.description && <p className={styles.body}>{card.description}</p>}
              </article>
            );
          }

          return (
            <article className={styles.card} key={card.id}>
              {src && (
                <Image
                  src={src}
                  alt={card.image?.alternativeText ?? ""}
                  width={520}
                  height={347}
                  className={styles.cardImage}
                  sizes="(max-width: 600px) 100vw, 33vw"
                />
              )}
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{card.title}</h3>
                {card.description && <p className={styles.body}>{card.description}</p>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
