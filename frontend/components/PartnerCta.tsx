"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "@/styles/partners.module.css";
import type { Region } from "@/lib/regions";
import Popup from "./Popup";

/**
 * The two "PARTNER WITH US" buttons on the partners page, plus the modal they
 * open. Ported from bg-Beacon/src/app/pages/Partners/page.js, where the same
 * button markup and popup state were written out twice.
 *
 * `variant` picks the styling: the hero button is the solid green pill, the one
 * inside the green banner is translucent white.
 */
export default function PartnerCta({
  region,
  variant = "solid",
}: {
  region: Region;
  variant?: "solid" | "onGreen";
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  // The legacy used `bg-white bg-opacity-10`, but the `bg-opacity-*` utilities
  // were removed in Tailwind v4 — that rendered a solid white block on the
  // green banner instead of a subtle translucent one. `bg-white/10` is the v4
  // equivalent.
  const buttonClass =
    variant === "onGreen"
      ? "bg-white/10 m-auto py-3 md:py-5 px-6 md:px-10 rounded-full"
      : "bg-[#13670B] m-auto py-3 md:py-5 px-6 md:px-10 rounded-full";

  return (
    <>
      <button
        type="button"
        className={buttonClass}
        onClick={() => setShowPopup(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span className="flex flex-col relative overflow-hidden text-sm md:text-lg font-medium">
          <span className="flex flex-row gap-2">
            <span
              className={`text-white ease-in-out duration-300 ${
                isHovered ? "-translate-y-[150%]" : ""
              }`}
            >
              PARTNER WITH US
            </span>
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
          </span>
          <span className="flex flex-row gap-2 absolute bottom-0">
            <span
              className={`text-white ease-in-out duration-300 ${
                isHovered ? "-translate-y-0" : "translate-y-[150%]"
              }`}
            >
              PARTNER WITH US
            </span>
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
          </span>
        </span>
      </button>

      <Popup
        region={region}
        heading="Partner With Us"
        variant="partner"
        image="/form2.png"
        open={showPopup}
        onClose={() => setShowPopup(false)}
      />
    </>
  );
}

export { styles as partnerStyles };
