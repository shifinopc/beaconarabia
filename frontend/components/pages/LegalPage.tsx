import PageShell from "@/components/PageShell";
import { REGIONS } from "@/lib/regions";

export interface LegalSection {
  heading: string;
  /** Paragraphs; a leading "• " renders the line as a list item. */
  body: string[];
}

/**
 * Shared renderer for the legal pages (privacy policy, terms of service).
 *
 * These existed on none of the three legacy sites, which meant the site
 * collected personal data through three forms with no published privacy
 * policy — a legal exposure, and a trust signal search engines weigh for
 * advisory businesses. Content lives in the route files as plain data; if
 * editors ever need to change it without a deploy, it can move to a CMS `Page`
 * entry later without touching this component.
 */
export default function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  /** ISO date shown as "Last updated". */
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <PageShell region={REGIONS.global}>
      <div className="legalContainer">
        <h1>{title}</h1>
        <p className="legalUpdated">Last updated: {updated}</p>
        <p>{intro}</p>
        {sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.body.map((text, i) =>
              text.startsWith("• ") ? (
                <p className="legalListItem" key={i}>
                  {text}
                </p>
              ) : (
                <p key={i}>{text}</p>
              ),
            )}
          </section>
        ))}
      </div>
    </PageShell>
  );
}
