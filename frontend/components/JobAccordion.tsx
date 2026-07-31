"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "@/styles/careers.module.css";
import type { Job } from "@/lib/strapi";

/**
 * "Our current open positions" accordion.
 *
 * Ported from bg-Beacon/src/app/pages/Careers/page.js. Two fixes over the
 * original: it rendered eight section headings ("Qualification Requirements",
 * "Employment status", "Salary"…) with no content beneath any of them, and the
 * Apply button did nothing. Headings now render only when there is something to
 * show, and Apply links to the contact page.
 */
export default function JobAccordion({
  jobs,
  contactHref,
}: {
  jobs: Job[];
  contactHref: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!jobs.length) {
    return (
      <p style={{ textAlign: "center", padding: "2rem 0" }}>
        No open positions right now — check back soon.
      </p>
    );
  }

  return (
    <div className={styles.faqContentMainContainer}>
      {jobs.map((job, index) => {
        const isOpen = openIndex === index;
        const details = job.details ?? [];
        const tags = [job.employmentType, job.location].filter(Boolean) as string[];

        return (
          <div className={styles.faqRight} key={job.documentId}>
            <div className={styles.faqContentContainer}>
              <div
                style={{ display: "flex", justifyContent: "space-between" }}
                className={styles.faqQuestionContainer}
                onClick={() => setOpenIndex(isOpen ? null : index)}
              >
                <div className={styles.faqQuestion}>
                  <h3>{job.title}</h3>
                </div>

                <div className={styles.faqdesc2}>
                  {tags.map((tag) => (
                    <div key={tag} className={styles.button}>
                      <p>{tag}</p>
                    </div>
                  ))}
                </div>

                <div
                  className={`${styles.faqAddIcon} ${isOpen ? styles.rotateIcon : ""}`}
                >
                  <button type="button" aria-expanded={isOpen} aria-label={job.title}>
                    <Image src="/+.svg" width={16} height={16} alt="" unoptimized />
                  </button>
                </div>
              </div>

              <div className={`${styles.faqDesc} ${isOpen ? styles.open : ""}`}>
                {details.length > 0 && (
                  <>
                    <p className={styles.faqHeading}>Job details</p>
                    {details.map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </>
                )}

                <div className={styles.faqButton}>
                  <a href={`${contactHref}?role=${encodeURIComponent(job.title)}`}>
                    <button type="button">Apply</button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
