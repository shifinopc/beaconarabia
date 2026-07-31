"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * The rolling hover button used across the legacy design.
 *
 * Extracted from the copy-pasted markup that appeared in Services.jsx, Hero.js
 * and several other components, each with its own duplicated hover state.
 * Class names are unchanged so the existing CSS applies as-is.
 */
export default function ExploreButton({
  label,
  className = "",
  /** Extra class for the visible containers — the About page layers its own. */
  btnClassName = "",
}: {
  label: string;
  className?: string;
  btnClassName?: string;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const arrow = isHovered ? "/whiteArrow.svg" : "/blackArrow.svg";

  return (
    <div
      className={`hButtonContainer ${className}`.trim()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="visibleWrapperContainer">
        <div className={`topVisibleContainer btn ${btnClassName}`.trim()}>
          {label}
          <div className="topVisibleArrow">
            <Image src={arrow} width={23} height={23} alt="" quality={100} unoptimized />
          </div>
        </div>
        <div className={`bottomVisibleContainer btn ${btnClassName}`.trim()}>
          {label}
          <div className="bottomVisibleArrow">
            <Image src={arrow} width={23} height={23} alt="" quality={100} unoptimized />
          </div>
        </div>
      </div>
    </div>
  );
}
