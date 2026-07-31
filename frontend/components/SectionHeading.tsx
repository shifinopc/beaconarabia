import styles from "@/styles/sections.module.css";

/**
 * Eyebrow + title pair shared by every Section-driven block.
 *
 * The legacy Saudi components each rendered their own `SectionName` /
 * `SectionTitle` pair with per-call padding overrides; this is the single
 * version of that.
 */
export default function SectionHeading({
  eyebrow,
  title,
  align = "center",
}: {
  eyebrow?: string | null;
  title: string;
  align?: "center" | "left";
}) {
  if (align === "left") {
    return (
      <>
        {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
        <h2 className={styles.title}>{title}</h2>
      </>
    );
  }

  return (
    <div className={styles.heading}>
      {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
      <h2 className={styles.title}>{title}</h2>
    </div>
  );
}
