"use client";

import Image from "next/image";
import { useState } from "react";
import type { Faq as FaqEntry } from "@/lib/strapi";
import { faqSchema, jsonLdProps } from "@/lib/structured-data";

/**
 * Ported from bg-Beacon/src/app/components/Faq.js.
 *
 * The legacy version seeded useState with a hardcoded array — so content lived
 * in component state and could never be edited without a deploy. Entries now
 * arrive as props from the Faq content type; only the open/closed accordion
 * state stays local.
 */
export default function Faq({
  entries,
  section,
}: {
  entries: FaqEntry[];
  /** Optional `faq-heading` Section. */
  section?: { eyebrow?: string | null; title: string; description?: string | null; ctaLabel?: string | null };
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (!entries.length) return null;

  /**
   * Emitted from the component rather than each page so every route that shows
   * FAQs is covered automatically and the markup cannot drift from the entries
   * actually rendered below.
   */
  const schema = faqSchema(entries);

  return (
    <div className="faqMainContainer">
      {schema && <script {...jsonLdProps(schema)} />}
      <div className="faqContainer">
        <div className="faqLeft">
          <div className="businessContentContainer">
            <p className="businessHeading">{section?.eyebrow ?? "FAQ"}</p>
            <h2 className="businessDesc">{section?.title ?? "Frequently Asked Questions"}</h2>
          </div>
        </div>

        <div className="faqContentMainContainer">
          {entries.map((entry, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                className="faqRight"
                key={entry.documentId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
              >
                <div className="faqCountContainer">
                  <span className="faqNumber">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <div className="faqContentContainer">
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                    className="faqQuestionContainer"
                  >
                    <div className="faqQuestion">
                      <h3>{entry.question}</h3>
                    </div>
                    <div className={`faqAddIcon ${isOpen ? "rotateIcon" : ""}`}>
                      {/* The icon is decorative (alt=""), so without an
                          aria-label this button has no accessible name at all —
                          screen readers and AI agents announce it as an
                          unlabelled control and cannot tell which question it
                          belongs to. Naming it with the question also gives the
                          five buttons on a page distinct names rather than five
                          identical "Expand" controls. */}
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-label={`${isOpen ? "Collapse" : "Expand"} answer: ${entry.question}`}
                      >
                        <Image src="/+.svg" width={16} height={16} alt="" />
                      </button>
                    </div>
                  </div>
                  <div className={`faqDesc ${isOpen ? "open" : ""}`}>
                    <p>{entry.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
