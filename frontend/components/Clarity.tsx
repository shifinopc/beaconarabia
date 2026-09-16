import Script from "next/script";

/**
 * Microsoft Clarity — session replay and heatmaps.
 *
 * Added alongside GA4 rather than instead of it: GA answers how many and from
 * where, Clarity answers what the visitor actually did on the page. The two
 * record the same visit and neither reads the other's data.
 *
 * The project ID is not a secret — it ships in the client bundle by design —
 * so, following the same reasoning as Analytics.tsx, it is a hardcoded default
 * rather than a required env var: a missing variable would silently mean no
 * recording at all. NEXT_PUBLIC_CLARITY_PROJECT_ID overrides it, so a second
 * property (a staging project, say) needs no code change.
 *
 * Clarity's own default masking hides the content of text inputs in replays,
 * which matters here because every form on the site collects a name, an email
 * and a phone number. Do not lower that setting in the Clarity dashboard
 * without revisiting the privacy policy, which tells visitors this is how it
 * behaves.
 *
 * Development is excluded so local browsing doesn't fill the recordings.
 */

const PROJECT_ID =
  process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || "yj2yi2x9ke";

export default function Clarity() {
  if (process.env.NODE_ENV !== "production" || !PROJECT_ID) return null;

  return (
    // An `id` is required on inline scripts for Next to track and dedupe them
    // across client-side navigations, exactly as with the GA snippet.
    <Script id="clarity-init" strategy="afterInteractive">
      {`
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${PROJECT_ID}");
      `}
    </Script>
  );
}
