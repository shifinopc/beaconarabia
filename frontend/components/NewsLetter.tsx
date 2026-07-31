"use client";

import emailjs from "@emailjs/browser";
import Image from "next/image";
import { useState } from "react";
import styles from "@/styles/newsletter.module.css";
import type { Region } from "@/lib/regions";

const EMAILJS = {
  serviceId: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID ?? "",
  templateId: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID ?? "",
  publicKey: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY ?? "",
};

/**
 * Newsletter signup — the block at the top of the footer.
 *
 * Ported from components/NewsLetter/NewsLetter.js, including the bell icon,
 * two-column layout and the trailing <hr> that separates it from the footer
 * body. It renders inside Footer, as in the legacy markup.
 *
 * Changes from the original: the EmailJS service/template/public keys were
 * hardcoded string literals in the component and the payload was logged to the
 * console on every submit — keys now come from env vars, logging removed.
 */
export default function NewsLetter({ region }: { region: Region }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const isConfigured = Boolean(EMAILJS.serviceId && EMAILJS.templateId && EMAILJS.publicKey);

  const handleSubmit = async () => {
    if (!email.trim() || !isConfigured) {
      setStatus("error");
      return;
    }

    setStatus("sending");
    try {
      await emailjs.send(
        EMAILJS.serviceId,
        EMAILJS.templateId,
        { email, clickedpopupname: "Newsletter", region: region.label },
        { publicKey: EMAILJS.publicKey },
      );
      setStatus("sent");
      setEmail("");
    } catch {
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
              {isConfigured
                ? "Failed to subscribe. Please try again."
                : "Newsletter is not configured yet."}
            </div>
          )}
        </div>
      </div>

      <hr className={styles.hrLine} />
    </>
  );
}
