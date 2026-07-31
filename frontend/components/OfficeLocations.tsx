"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "@/styles/contact.module.css";
import type { Office } from "@/lib/strapi";

const COUNTRY_LABELS: Record<string, string> = {
  ksa: "Saudi Arabia",
  uae: "UAE",
  bahrain: "Bahrain",
  qatar: "Qatar",
};

/** Tab order, matching the legacy page. */
const COUNTRY_ORDER = ["ksa", "uae", "bahrain", "qatar"];

/**
 * Country tabs + office cards on the contact page.
 *
 * Ported from bg-Beacon/src/app/pages/Contact/page.js, where each of the seven
 * offices was a hand-written block of JSX repeated inside four conditional
 * branches. Offices now come from Strapi, so opening or closing one is a CMS
 * edit rather than a code change — tabs are derived from whichever countries
 * actually have offices.
 */
export default function OfficeLocations({ offices }: { offices: Office[] }) {
  const countries = COUNTRY_ORDER.filter((c) => offices.some((o) => o.country === c));
  const [active, setActive] = useState(countries[0] ?? "ksa");

  if (!offices.length) return null;

  const shown = offices.filter((o) => o.country === active);

  return (
    <div className={styles.container1}>
      <div className={styles.loctaionButtonContainer} role="tablist">
        {countries.map((c) => (
          <button
            key={c}
            role="tab"
            aria-selected={active === c}
            className={`${styles.ksa} ${active === c ? styles.btnActive : ""}`}
            onClick={() => setActive(c)}
          >
            {COUNTRY_LABELS[c] ?? c}
          </button>
        ))}
      </div>

      <div className={styles.contactMainCard}>
        {shown.map((office) => {
          const phones = office.phones ?? [];
          return (
            <div
              className={`${styles.contactCard} ${office.wide ? styles.contactCardUAE : ""}`}
              key={office.documentId}
            >
              <a href={office.mapUrl} target="_blank" rel="noreferrer">
                <div className={styles.contactImgContainer}>
                  <Image
                    src="/NewSvgs/SVG2/Group7.svg"
                    width={72}
                    height={72}
                    alt=""
                    unoptimized
                  />
                </div>
                <div className={styles.contactCardContents}>
                  <h3 className={`${styles.jeddah} servicesHeading`}>{office.city}</h3>
                  <p className={styles.cardDesc}>{office.address}</p>
                </div>
              </a>

              {phones.length > 0 && (
                <div className={styles.numberContainer}>
                  <a href={`tel:${phones[0].replace(/[^0-9+]/g, "")}`}>
                    {phones.map((phone, i) => (
                      <span key={phone}>
                        {i > 0 && <br />}
                        {phone}
                      </span>
                    ))}
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
