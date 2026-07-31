"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "@/styles/ebook.module.css";
import type { Region } from "@/lib/regions";
import Popup from "./Popup";

/**
 * Lead-magnet banner for the business setup guide.
 *
 * Ported from bg-Beacon/src/app/components/Ebook/EbookBanner.js, which sits at
 * the end of the Clients section. Clicking through opens the enquiry modal in
 * its "ebook" variant, which downloads /ebook/ebook.pdf after a successful
 * submit.
 *
 * Fixes a bug in the original: it used `class=` instead of `className=` on the
 * button, which React logs as "Invalid DOM property `class`" on every render —
 * it was the only console error on the live site.
 */
export default function EbookBanner({
  region,
  section,
}: {
  region: Region;
  /** Optional `ebook-banner` Section. */
  section?: {
    eyebrow?: string | null;
    title: string;
    description?: string | null;
    ctaLabel?: string | null;
  };
}) {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <>
      <div className={styles.container}>
        <div className={styles.leftContainer}>
          <Image
            src="/ebook/1.png"
            alt="Business setup guide"
            width={300}
            height={400}
          />
        </div>
        <div className={styles.rightContainer}>
          <div className={styles.title}>{section?.title ?? "Business Setup Guide for Saudi Arabia"}</div>
          <div className={styles.description}>
              {section?.description ??
                "Everything you need to know about setting up a business in Saudi Arabia can be found in our detailed guide for 2024. Our expert insights help you to navigate regulatory requirements easily and create a systematic plan for business formation."}
            </div>
          <button
            type="button"
            className={styles.circulatingBorderButton}
            onClick={() => setShowPopup(true)}
          >
            ACCESS THE GUIDE{" "}
            <Image src="/ebook/icon.svg" alt="" width={23} height={23} />
          </button>
        </div>
      </div>

      <Popup
        region={region}
        heading="Download Ebook"
        variant="ebook"
        open={showPopup}
        onClose={() => setShowPopup(false)}
      />
    </>
  );
}
