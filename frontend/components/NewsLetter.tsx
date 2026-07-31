"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "@/styles/newsletter.module.css";
import type { Region } from "@/lib/regions";
import { submitForm, HONEYPOT_FIELD, honeypotStyle } from "@/lib/submit-form";

/**
 * Newsletter signup — the block at the top of the footer.
 *
 * Ported from components/NewsLetter/NewsLetter.js, including the bell icon,
 * two-column layout and the trailing <hr> that separates it from the footer
 * body. It renders inside Footer, as in the legacy markup.
 *
 * Changes from the original: the EmailJS service/template/public keys were
 * hardcoded string literals in the component and the payload was logged to the
 * console on every submit — logging removed, and the send now goes through
 * /api/contact so no key reaches the browser at all (see ContactForm).
 *
 * No Turnstile widget here: a challenge above a single email field in the
 * footer is disproportionate, and the honeypot plus the server-side rate limit
 * already cover the realistic abuse. The contact and popup forms, which send
 * far more content, do carry it.
 */
export default function NewsLetter({ region }: { region: Region }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [honeypot, setHoneypot] = useState("");

  const handleSubmit = async () => {
    if (!email.trim()) {
      setStatus("error");
      return;
    }

    setStatus("sending");
    const result = await submitForm({
      kind: "newsletter",
      email,
      subject: "Newsletter signup",
      region: region.label,
      [HONEYPOT_FIELD]: honeypot,
    });

    if (result.ok) {
      setStatus("sent");
      setEmail("");
    } else {
      setStatus("error");
    }
  };

  const buttonLabel =
    status === "sending" ? "Loading..." : status === "sent" ? "Subscribed" : "Subscribe";

  return (
    <>
      <div className={styles.container}>
        <div className={styles.rightContainer}>
          <div className={styles.imageContainer}>
            <Image src="/newsletter/Icon.png" alt="" width={80} height={80} unoptimized />
          </div>
          <div className={styles.textContainer}>
            <div className={styles.title}>Sign Up to Our Newsletters</div>
            <div className={styles.description}>
              Subscribe to our Newsletter &amp; Event right now to stay updated
            </div>
          </div>
        </div>

        <div>
          <div style={honeypotStyle} aria-hidden="true">
            <label htmlFor="newsletter-website">Do not fill this in</label>
            <input
              type="text"
              id="newsletter-website"
              name={HONEYPOT_FIELD}
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div className={styles.leftContainer}>
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              placeholder="Enter your email"
              style={{ transition: "none" }}
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
            />
            <div
              className={styles.button}
              role="button"
              tabIndex={0}
              onClick={handleSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleSubmit();
              }}
            >
              {buttonLabel}
            </div>
          </div>

          {status === "sent" && (
            <div className={styles.statusMessage} style={{ color: "#fff" }} role="status">
              Subscribed successfully.
            </div>
          )}
          {status === "error" && (
            <div className={styles.statusMessage} style={{ color: "#fff" }} role="alert">
              Failed to subscribe. Please try again.
            </div>
          )}
        </div>
      </div>

      <hr className={styles.hrLine} />
    </>
  );
}
