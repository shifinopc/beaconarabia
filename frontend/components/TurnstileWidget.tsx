"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renders the Cloudflare Turnstile challenge and reports its token upward.
 *
 * Renders nothing at all when NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset, so the
 * forms behave exactly as before until Turnstile is configured — the server
 * side skips verification under the same condition, so the two stay in step.
 *
 * The script is loaded once per page and shared: three forms can appear on one
 * page (contact, newsletter, popup) and loading the Cloudflare bundle three
 * times would race and render duplicate widgets.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "flexible";
        },
      ) => string | undefined;
      remove: (widgetId: string) => void;
    };
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SCRIPT_ID = "cf-turnstile-script";

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("turnstile")));
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("turnstile"));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export default function TurnstileWidget({
  onToken,
}: {
  onToken: (token: string) => void;
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    let cancelled = false;
    const container = containerRef.current;

    loadScript()
      .then(() => {
        if (cancelled || !window.turnstile || !container) return;
        widgetIdRef.current = window.turnstile.render(container, {
          sitekey: siteKey,
          callback: (token) => onToken(token),
          // A token is good for a few minutes; clear it when it lapses so a
          // stale one is never submitted (the server would reject it anyway).
          "expired-callback": () => onToken(""),
          "error-callback": () => {
            onToken("");
            setFailed(true);
          },
          size: "flexible",
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Widget already gone (fast navigation) — nothing to clean up.
        }
      }
    };
  }, [siteKey, onToken]);

  if (!siteKey) return null;

  return (
    <div style={{ width: "100%" }}>
      <div ref={containerRef} />
      {failed && (
        <p role="alert" style={{ fontSize: 13 }}>
          Couldn&apos;t load the verification widget. Please disable any ad
          blocker for this page, or email us directly.
        </p>
      )}
    </div>
  );
}
