"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CONTACT_PHONE, CONTACT_PHONE_HREF, navFor, regionLinksFor } from "@/lib/nav";
import type { Region } from "@/lib/regions";

/**
 * Ported from bg-Beacon/src/app/components/MobileHeader.js.
 *
 * The original inlined ~40 style objects in JSX and hardcoded every link. This
 * keeps the same visual result but uses the existing `mHeader` / `mLinks`
 * classes from the ported stylesheet, with region-aware links. The menu closes
 * on navigation, which the legacy version never did — tapping a link left the
 * overlay covering the destination page.
 */
export default function MobileHeader({ region }: { region: Region }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const menu = navFor(region).filter((item) => !item.hasDropdown);
  const regionLinks = regionLinksFor(region);
  const homeHref = region.segment ? `/${region.segment}` : "/";

  const close = () => {
    setIsMenuOpen(false);
    setIsDropdownOpen(false);
  };

  return (
    <div
      className="mHeader"
      style={{
        backgroundColor: "#ffffff",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
      }}
    >
      <div
        className="mHeaderContainer"
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          height: "100%",
        }}
      >
        <Link href={homeHref} onClick={close}>
          <Image
            src="/NewSvgs/Logos/Beacon11.svg"
            width={120}
            height={30}
            alt="Beacon"
            unoptimized
          />
        </Link>

        <button
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
          style={{
            color: "#02040e",
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            outline: "none",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="36"
            height="36"
            fill="none"
            viewBox="0 0 24 24"
            stroke="#02040E"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16m-7 6h7"}
            />
          </svg>
        </button>

        <nav
          style={{
            position: "fixed",
            top: "4rem",
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "#ffffff",
            zIndex: 52,
            display: isMenuOpen ? "flex" : "none",
            flexDirection: "column",
            alignItems: "flex-end",
            padding: "24px",
            gap: "15px",
          }}
        >
          {menu.map((item) => (
            <Link key={item.text} href={item.href} className="mLinks" onClick={close}>
              {item.text}
            </Link>
          ))}

          <div
            className="mLinks"
            style={{ cursor: "pointer", display: "flex", gap: "1.6vw" }}
            onClick={() => setIsDropdownOpen((open) => !open)}
          >
            Explore
            <img src="/dropDown.png" alt="" />
          </div>

          {isDropdownOpen &&
            regionLinks.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className="mLinks"
                style={{ paddingRight: "1rem", opacity: 0.8 }}
                onClick={close}
              >
                {r.label}
              </Link>
            ))}

          <a href={CONTACT_PHONE_HREF} className="mLinks" onClick={close}>
            {CONTACT_PHONE}
          </a>
        </nav>
      </div>
    </div>
  );
}
