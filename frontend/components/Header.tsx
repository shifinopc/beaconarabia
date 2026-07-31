"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CONTACT_PHONE, CONTACT_PHONE_HREF, navFor, regionLinksFor } from "@/lib/nav";
import type { Region } from "@/lib/regions";

/**
 * Ported from bg-Beacon/src/app/components/Header.js.
 *
 * Changes from the original:
 *  - nav links are region-aware rather than hardcoded `/pages/About/`
 *  - the "Explore" dropdown links to internal /ae and /sa routes instead of
 *    the external subdomains
 *  - dropped the localStorage `activeMenuItem` read, which set active state
 *    from a previous visit rather than the current URL; `usePathname` alone is
 *    correct and avoids a hydration mismatch
 */
export default function Header({ region }: { region: Region }) {
  const [isPresenceOpen, setIsPresenceOpen] = useState(false);
  const pathname = usePathname();

  const menuList = navFor(region);
  const regionLinks = regionLinksFor(region);
  const homeHref = region.segment ? `/${region.segment}` : "/";

  return (
    <div className="hContainer bg-white">
      <Link href={homeHref}>
        <div className="logoContainer">
          <Image
            src="/NewSvgs/Logos/Beacon11.svg"
            width={180}
            height={60}
            alt="Beacon"
            quality={100}
            priority
            unoptimized
          />
        </div>
      </Link>

      <div className="hMenuContainer">
        <div className="hMenu">
          <ul className="hUlList">
            {menuList.map((item) => (
              <li
                key={item.text}
                className={`huListTransitionWrapper ${
                  pathname === item.href ? "active" : ""
                } ${item.hasDropdown ? "hasDropdown" : ""}`}
                onClick={() =>
                  setIsPresenceOpen(item.hasDropdown ? !isPresenceOpen : false)
                }
              >
                {item.hasDropdown ? (
                  <button
                    type="button"
                    // Reset UA button styling so it matches the sibling <a>
                    // items — the legacy markup used an <a href="#"> here.
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      font: "inherit",
                      color: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    <div className="listHoverTop">
                      <div className="dropDown">
                        {item.text}
                        <img src="/dropDown.png" alt="" />
                      </div>
                    </div>
                    <div className="listHoverBottom">{item.text}</div>
                  </button>
                ) : (
                  <Link href={item.href}>
                    <div className="listHoverTop">{item.text}</div>
                    <div className="listHoverBottom">{item.text}</div>
                  </Link>
                )}

                {item.hasDropdown && isPresenceOpen && (
                  <div className="dropdownContent">
                    {regionLinks.map((r) => (
                      <Link key={r.href} href={r.href}>
                        <p>{r.label}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <a href={CONTACT_PHONE_HREF}>
        <div className="hButtonContainer headerContactButton">
          <div className="visibleWrapperContainer">
            <div className="topVisibleContainer btn">
              <Image src="/telephone.svg" width={18} height={18} alt="" />
              {CONTACT_PHONE}
            </div>
            <div className="bottomVisibleContainer btn">
              <Image src="/telephone.svg" width={18} height={18} alt="" />
              {CONTACT_PHONE}
            </div>
          </div>
        </div>
      </a>
    </div>
  );
}
