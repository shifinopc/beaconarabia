"use client";

import { useCallback, useEffect, useState } from "react";
import type { Region } from "@/lib/regions";
import TurnstileWidget from "./TurnstileWidget";
import { submitForm, HONEYPOT_FIELD, honeypotStyle } from "@/lib/submit-form";

const EMPTY = { name: "", phone: "", email: "", companyname: "" };

/**
 * "Book a call with us" enquiry modal.
 *
 * Ported from bg-Beacon/src/app/components/Popup.js. Behaviour preserved:
 * appears a few seconds after first load, collects name/phone/email/company and
 * sends via EmailJS.
 *
 * Changes from the original:
 *  - EmailJS ids come from env vars (they were string literals) and the form
 *    payload is no longer console.logged
 *  - dismissal is remembered in sessionStorage, so it does not reappear on
 *    every navigation within a visit — the legacy version re-fired on each page
 *  - Escape closes it, focus moves to the dialog, and it is marked
 *    role="dialog" aria-modal; the original was an unlabelled div
 *  - carries the region so enquiries are attributable to a regional site
 */
export default function Popup({
  region,
  heading = "Book a call with us",
  delayMs = 5000,
  /** "ebook" downloads the guide after a successful submit. */
  variant = "call",
  image = "/Form.webp",
  open,
  onClose,
}: {
  region: Region;
  heading?: string;
  delayMs?: number;
  variant?: "call" | "ebook" | "partner";
  /** Side image; the partners popup uses /form2.png. */
  image?: string;
  /** Controlled mode — when provided, the auto-open timer is skipped. */
  open?: boolean;
  onClose?: () => void;
}) {
  const isControlled = open !== undefined;
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY);
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");

  // Stable so the challenge isn't re-rendered on every keystroke.
  const handleToken = useCallback((token: string) => setTurnstileToken(token), []);

  useEffect(() => {
    // Controlled instances (e.g. the ebook banner) open on demand, not on a timer.
    if (isControlled) return;
    if (sessionStorage.getItem("beacon:popup-dismissed") === "1") return;
    const timeout = setTimeout(() => setIsOpen(true), delayMs);
    return () => clearTimeout(timeout);
  }, [delayMs, isControlled]);

  const close = () => {
    if (isControlled) {
      onClose?.();
      return;
    }
    setIsOpen(false);
    sessionStorage.setItem("beacon:popup-dismissed", "1");
  };

  const visible = isControlled ? open : isOpen;

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible]);

  if (!visible) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError("");

    const result = await submitForm({
      kind: "popup",
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      subject: heading,
      message: formData.companyname ? `Company: ${formData.companyname}` : "",
      region: region.label,
      [HONEYPOT_FIELD]: honeypot,
      turnstileToken,
    });

    if (!result.ok) {
      setStatus("error");
      setError(result.error ?? "Something went wrong. Please try again.");
      return;
    }

    if (variant === "ebook") {
      const link = document.createElement("a");
      link.href = "/ebook/ebook.pdf";
      link.download = "beacon-business-setup-guide.pdf";
      link.click();
    }

    close();
  };

  return (
    <>
      <div className="backgrounddim" onClick={close} />
      <div className="popup" role="dialog" aria-modal="true" aria-label={heading}>
        <button
          type="button"
          className="closeButton"
          onClick={close}
          aria-label="Close"
          style={{
            cursor: "pointer",
            position: "absolute",
            zIndex: 999,
            background: "none",
            border: "none",
          }}
        >
          <img src="/close-b.svg" alt="" className="closeImage" loading="lazy" decoding="async" />
        </button>

        <div className="imageForm">
          {/* The popup is not shown on load, so nothing here belongs on the
              critical path — eager, these were preloaded into <head> anyway. */}
          <img src={image} alt="" className="popupImage" loading="lazy" decoding="async" />
        </div>

        <form className="popupForm" style={{ position: "relative" }} onSubmit={handleSubmit}>
          <p className="popupheading">{heading}</p>

          <input
            type="text"
            name="name"
            placeholder="Full name"
            className="inputBoxF"
            value={formData.name}
            onChange={handleChange}
            required
            autoFocus
          />
          <input
            type="tel"
            name="phone"
            placeholder="Phone Number"
            className="inputBoxF"
            value={formData.phone}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            className="inputBoxF"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="companyname"
            placeholder="Company Name"
            className="inputBoxF"
            value={formData.companyname}
            onChange={handleChange}
          />

          <div style={honeypotStyle} aria-hidden="true">
            <label htmlFor="popup-website">Do not fill this in</label>
            <input
              type="text"
              id="popup-website"
              name={HONEYPOT_FIELD}
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <TurnstileWidget onToken={handleToken} />

          <button
            type="submit"
            className="subButton"
            disabled={status === "sending"}
            style={{ border: "none", cursor: "pointer" }}
          >
            {status === "sending"
              ? "…"
              : variant === "ebook"
                ? "Download Ebook"
                : variant === "partner"
                  ? "Partner With Us"
                  : "Book Now"}
          </button>

          {status === "error" && (
            <p role="alert" style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
              {error}
            </p>
          )}
        </form>
      </div>
    </>
  );
}
