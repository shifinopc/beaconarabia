"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

/**
 * The pill CTA used across the site — "Contact Us", "Explore More",
 * "Let's Talk", "Know More", "Get in Touch".
 *
 * Ported from bg-Beacon/src/app/components/Button.js. This is NOT the same
 * button as `hButtonContainer` (see ExploreButton): it is Tailwind-based, with
 * a solid green pill and a label+arrow pair that rolls up on hover while a
 * duplicate rolls in from below.
 *
 * Using ExploreButton in these places rendered an empty green pill, because the
 * legacy CSS sizes `hButtonContainer` for its own markup and clipped the label
 * out of view.
 */
export default function CtaButton({
  content,
  href,
}: {
  content: string;
  href: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      className="bg-[#13670B] m-auto py-3 md:py-5 px-6 md:px-10 rounded-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link
        href={href}
        className="flex flex-col relative overflow-hidden text-sm md:text-lg font-medium"
      >
        <div className="flex flex-row gap-2">
          <p
            className={`text-white ease-in-out duration-300 ${
              isHovered ? "-translate-y-[150%]" : ""
            }`}
          >
            {content}
          </p>
          <Image
            src="/whiteArrow.svg"
            width={23}
            height={23}
            alt=""
            unoptimized
            className={`ease-in-out duration-300 ${
              isHovered ? "-translate-y-[150%] translate-x-5" : ""
            } w-[15px] h-[15px] md:w-[23px] md:h-[23px]`}
          />
        </div>

        <div className="flex flex-row gap-2 absolute bottom-0">
          <p
            className={`text-white ease-in-out duration-300 ${
              isHovered ? "-translate-y-0" : "translate-y-[150%]"
            }`}
          >
            {content}
          </p>
          <Image
            src="/whiteArrow.svg"
            width={23}
            height={23}
            alt=""
            unoptimized
            className={`ease-in-out duration-300 ${
              isHovered ? "" : "translate-y-[150%] -translate-x-5"
            } w-[15px] h-[15px] md:w-[23px] md:h-[23px]`}
          />
        </div>
      </Link>
    </button>
  );
}
