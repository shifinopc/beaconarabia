"use client";

import Image from "next/image";
import { useState } from "react";
import type { Section } from "@/lib/strapi";

/**
 * A Section rendered as the site's accordion — used for Dubai's
 * "What's The Process Of Business Setup In Dubai?" steps.
 *
 * Deliberately reuses the `faq*` class names rather than the sections module:
 * this is the same control as the FAQ block visually, and the legacy UAE page
 * built it from the same component. Only the heading and the source of the
 * entries differ.
 *
 * Numbering comes from each card's `badge` so an editor controls it, falling
 * back to position — the legacy data carried "01".."06" explicitly.
 */
export default function SectionAccordion({ section }: { section: Section }) {
  const cards = section.cards ?? [];
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (!cards.length) return null;

  return (
    <div className="faqMainContainer">
      <div className="faqContainer">
        <div className="faqLeft">
          <div className="businessContentContainer">
            {section.eyebrow && <p className="businessHeading">{section.eyebrow}</p>}
            <h2 className="businessDesc">{section.title}</h2>
          </div>
        </div>

        <div className="faqContentMainContainer">
          {cards.map((card, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                className="faqRight"
                key={card.id}
                onClick={() => setOpenIndex(isOpen ? null : index)}
              >
                <div className="faqCountContainer">
                  <span className="faqNumber">
                    {card.badge ?? String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="faqContentContainer">
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                    className="faqQuestionContainer"
                  >
                    <div className="faqQuestion">
                      <h3>{card.title}</h3>
                    </div>
                    <div className={`faqAddIcon ${isOpen ? "rotateIcon" : ""}`}>
                      <button type="button" aria-expanded={isOpen}>
                        <Image src="/+.svg" width={16} height={16} alt="" />
                      </button>
                    </div>
                  </div>
                  <div className={`faqDesc ${isOpen ? "open" : ""}`}>
                    <p>{card.description}</p>
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
