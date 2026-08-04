"use client";

import { useEffect, useState } from "react";

const WORDS = ["Growth", "Success", "Strategy", "Expansion"];
const WORD_INTERVAL_MS = 450;
const DISMISS_AFTER_MS = 600;

/**
 * Intro loading overlay.
 *
 * Ported from the `#white-screen` block in bg-Beacon/src/app/page.js plus
 * LoadingCircle.js. Keeps the original behaviour: a white overlay with the
 * Lottie spinner and a rotating word, dismissed 600ms after mount (the CSS
 * transition then collapses its height).
 *
 * Two accessibility/SEO guards the original lacked:
 *  - aria-hidden + inert semantics via pointer-events once dismissed, so the
 *    overlay can't trap clicks if a transition stalls
 *  - honours prefers-reduced-motion by skipping the word rotation
 *
 * The page content is server-rendered underneath, so crawlers still see it —
 * the overlay only covers it visually.
 *
 * The spinner is CSS, not Lottie. `lottie-react` plus its animation data was a
 * 307 KB client chunk — the largest single thing the site shipped — to render a
 * decorative ring for 600ms. On a throttled mobile connection that competed for
 * bandwidth with the CSS and hero image that LCP actually depends on. The
 * replacement is a bordered circle rotated by a keyframe: visually equivalent at
 * 50px, and free.
 */
export default function IntroLoader() {
  const [dismissed, setDismissed] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setDismissed(true), DISMISS_AFTER_MS);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = setInterval(
      () => setWordIndex((i) => (i + 1) % WORDS.length),
      WORD_INTERVAL_MS,
    );
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      id="white-screen"
      className={dismissed ? "hidden" : ""}
      aria-hidden="true"
      style={dismissed ? { pointerEvents: "none" } : undefined}
    >
      <div className="DesktopLottieContainer">
        <span className="introSpinner" />
      </div>
      <div className="MobileLottieContainer">
        <span className="introSpinner" />
      </div>

      <div className="changeTextContainer">
        <h2 className="spinnerText">Your Global Advisory Partner For</h2>
        <h2 className="changeText">
          <span className="spinnerText"> Business </span> {WORDS[wordIndex]}
        </h2>
      </div>
    </div>
  );
}
