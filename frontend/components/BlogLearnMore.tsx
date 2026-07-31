"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import styles from "@/styles/personalBlog.module.css";

/**
 * "Learn More" button under the homepage blog cards.
 *
 * This is NOT the generic green ExploreButton: the blog section styles its own
 * button as transparent with a 1px dark border, dark uppercase text and
 * `margin: 0 auto` to centre it (`.companyBlog .blogButton`). Using the generic
 * one rendered a green pill with the label clipped out of view.
 *
 * Markup mirrors the legacy PersonalBlog.js: the `btn` class sits on the inner
 * link, not on the visible containers.
 */
export default function BlogLearnMore({ href }: { href: string }) {
  const [isHovered, setIsHovered] = useState(false);
  const arrow = isHovered ? "/whiteArrow.svg" : "/blackArrow.svg";

  return (
    <div
      className={`${styles.blogButton} hButtonContainer servicesButton`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="visibleWrapperContainer">
        <div className="topVisibleContainer">
          <Link href={href} className={`${styles.blogButtonText} btn`}>
            Learn More
            <div className={`${styles.topBlogArrow} topVisibleArrow`}>
              <Image src={arrow} width={23} height={23} alt="" unoptimized />
            </div>
          </Link>
        </div>
        <div className="bottomVisibleContainer">
          <Link href={href} className={`${styles.blogButtonText} btn`}>
            Learn More
            <div className={`${styles.bottomBlogArrow} bottomVisibleArrow`}>
              <Image src={arrow} width={23} height={23} alt="" unoptimized />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
