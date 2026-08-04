"use client";

import { useEffect, useRef, useState } from "react";
import type { Client, Testimonial } from "@/lib/strapi";
import type { Region } from "@/lib/regions";
import EbookBanner from "./EbookBanner";
import Testimonials from "./Testimonials";


/**
 * Clients section: logo scroller + testimonial carousel.
 *
 * Ported from bg-Beacon/src/app/components/Clients.js. The logo strip is the
 * CSS marquee the design ships (`.scroller` / `.scroller__inner`), not a
 * framer-motion animation — the stylesheet only animates once the scroller
 * carries `data-animated="true"`, and the keyframe translates -50%, so the
 * children must be duplicated. That duplication is done here in React rather
 * than by cloning DOM nodes imperatively as the original did.
 *
 * prefers-reduced-motion is respected: the attribute is never set, so the strip
 * renders as a static wrapped row exactly as the CSS fallback intends.
 */
export default function Clients({
  clients,
  logos,
  region,
  testimonials,
  testimonialsSection,
  section,
  ebookSection,
}: {
  clients: Client[];
  logos: string[];
  region: Region;
  testimonials?: Testimonial[];
  testimonialsSection?: { title: string; eyebrow?: string | null; description?: string | null };
  /** Optional `clients-heading` Section. */
  section?: { eyebrow?: string | null; title: string; description?: string | null; ctaLabel?: string | null };
  ebookSection?: { title: string; description?: string | null; ctaLabel?: string | null };
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(id);
  }, []);

  if (!logos.length) return null;


  return (
    <div className="clientsContainer">
      <div className="businessContentContainer">
        <p className="businessHeading">{section?.eyebrow ?? "our CLIENTS"}</p>
        <h2 className="businessDesc">{section?.title ?? "Our core partners"}</h2>
      </div>

      <div className="clientsImgContainer">
        <div
          className="scroller"
          data-direction="left"
          data-speed="fast"
          {...(animated ? { "data-animated": "true" } : {})}
          ref={scrollerRef}
        >
          <div className="scroller__inner">
            {/*
              loading="lazy" is load-bearing, not a micro-optimisation.

              React treats an eager <img> rendered this early as worth
              preloading, and emits <link rel="preload" as="image"> for each one
              into <head>. With ~20 logos that meant ~20 preloads and roughly
              800 KB fetched at high priority — ahead of the 80 KB of
              render-blocking CSS and competing with the 14 KB hero image that
              is the actual LCP element on mobile. The logos sit far below the
              fold and are not worth a single byte of the critical path.
            */}
            {logos.map((src, i) => (
              <img
                key={`logo-${i}`}
                src={src}
                alt={clients[i]?.name ?? ""}
                className="logoClients"
                loading="lazy"
                decoding="async"
              />
            ))}
            {/* Duplicate set — the -50% keyframe needs it to loop seamlessly. */}
            {animated &&
              logos.map((src, i) => (
                <img
                  key={`logo-dup-${i}`}
                  src={src}
                  alt=""
                  aria-hidden="true"
                  className="logoClients"
                  loading="lazy"
                  decoding="async"
                />
              ))}
          </div>
        </div>
      </div>

      <Testimonials items={testimonials} section={testimonialsSection} />

      {/* Sits inside the clients section, as in the legacy markup. */}
      <EbookBanner region={region} section={ebookSection} />
    </div>
  );
}
