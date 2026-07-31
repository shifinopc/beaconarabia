"use client";

import emailjs from "@emailjs/browser";
import { useState } from "react";
import styles from "@/styles/contact.module.css";
import type { Region } from "@/lib/regions";

const EMAILJS = {
  serviceId: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID ?? "",
  templateId: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID ?? "",
  publicKey: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY ?? "",
};

const EMPTY = { name: "", email: "", phone: "", subject: "", message: "" };

type Status = "idle" | "sending" | "sent" | "error";

/**
 * Contact form, ported from bg-Beacon/src/app/pages/Contact/page.js.
 *
 * Uses the design's own contact.module.css classes (formContainer, textBox,
 * formSubmit) and the same label/placeholder copy, so it renders as the legacy
 * form did rather than as unstyled markup.
 *
 * Changes from the legacy version:
 *  - EmailJS ids come from env vars rather than a committed emailjs.config.js
 *  - the payload carries the region, so enquiries from /ae and /sa are
 *    distinguishable in the inbox (the old sites each hardcoded their own
 *    `website` value to achieve this, which no longer works from one codebase)
 */
export default function ContactForm({
  region,
  submitLabel = "Send Message",
  enquiryType,
}: {
  region: Region;
  /** The partners page submits "Become a partner". */
  submitLabel?: string;
  /** Distinguishes partner applications from general enquiries in the inbox. */
  enquiryType?: string;
}) {
  const [formData, setFormData] = useState(EMPTY);
  const [status, setStatus] = useState<Status>("idle");
  const [isHovered, setIsHovered] = useState(false);

  const isConfigured = Boolean(EMAILJS.serviceId && EMAILJS.templateId && EMAILJS.publicKey);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured) {
      setStatus("error");
      return;
    }

    setStatus("sending");
    try {
      await emailjs.send(
        EMAILJS.serviceId,
        EMAILJS.templateId,
        { ...formData, region: region.label, ...(enquiryType ? { enquiryType } : {}) },
        { publicKey: EMAILJS.publicKey },
      );
      setStatus("sent");
      setFormData(EMPTY);
    } catch {
      setStatus("error");
    }
  };

  return (
    <form className={styles.formContainer} onSubmit={handleSubmit}>
      <div>
        <label htmlFor="name">Full name *</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="John David"
        />
      </div>
      <div>
        <label htmlFor="email">Your email *</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          placeholder="example@yourmail.com"
        />
      </div>
      <div>
        <label htmlFor="phone">Phone *</label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          required
          placeholder="your number here"
        />
      </div>
      <div>
        <label htmlFor="subject">Subject *</label>
        <input
          type="text"
          id="subject"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          required
          placeholder="How can we help"
        />
      </div>
      <div className={styles.textBox}>
        <label htmlFor="message">How May We Assist You?</label>
        <textarea
          id="message"
          name="message"
          rows={4}
          value={formData.message}
          onChange={handleChange}
          placeholder="Type your message here..."
        />
      </div>
      <div className={styles.formSubmit} />

      <div className="ml-auto">
        <button
          type="submit"
          disabled={status === "sending"}
          className="bg-[#13670B] ml-auto py-3 md:py-5 px-6 md:px-14 rounded-full"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="flex !w-full flex-col relative overflow-hidden text-sm md:text-lg font-medium">
            <div className="flex !w-full flex-row">
              <p
                className={`text-white ease-in-out duration-300 ${
                  isHovered ? "-translate-y-[150%]" : ""
                }`}
              >
                {status === "sending" ? "Sending…" : submitLabel}
              </p>
            </div>
            <div className="flex flex-row !w-full absolute bottom-0">
              <p
                className={`text-white ease-in-out duration-300 ${
                  isHovered ? "-translate-y-0" : "translate-y-[150%]"
                }`}
              >
                {status === "sending" ? "Sending…" : submitLabel}
              </p>
            </div>
          </div>
        </button>
      </div>

      {status === "sent" && <p role="status">Thanks — we&apos;ll be in touch shortly.</p>}
      {status === "error" && (
        <p role="alert">
          {isConfigured
            ? "Something went wrong. Please try again or email us directly."
            : "Contact form is not configured yet (missing EmailJS environment variables)."}
        </p>
      )}
    </form>
  );
}
