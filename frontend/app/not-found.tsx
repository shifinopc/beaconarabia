import Link from "next/link";
import type { Metadata } from "next";

/**
 * 404 page.
 *
 * Without this file Next serves its own bare black-and-white default, which
 * gives a visitor no way back into the site — and this route is reached more
 * often than it looks: the region pages call notFound() for any unknown
 * segment, and every old legacy URL (/pages/About/ and friends) lands here
 * after the migration.
 *
 * Deliberately not wrapped in PageShell. The shell fetches header, footer and
 * site settings from Strapi, and a CMS outage is one of the ways people end up
 * on an error page in the first place — this must render even then.
 */
export const metadata: Metadata = {
  title: "Page not found",
  // A 404 has nothing worth indexing, and letting crawlers keep it out of the
  // index avoids soft-404 confusion during the migration.
  robots: { index: false, follow: true },
};

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About us" },
  { href: "/services", label: "Services" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "60px 24px",
        gap: 16,
      }}
    >
      <p style={{ color: "#13670b", fontWeight: 600, letterSpacing: "0.08em" }}>404</p>
      <h1 style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 600, color: "#02040e" }}>
        We couldn&apos;t find that page
      </h1>
      <p style={{ color: "#58595b", maxWidth: 520 }}>
        The page may have moved, or the link that brought you here may be out of
        date. Here&apos;s where most people are headed:
      </p>

      <nav
        aria-label="Popular pages"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          justifyContent: "center",
          marginTop: 8,
        }}
      >
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              border: "1px solid #d3d3d3",
              borderRadius: 76,
              padding: "12px 24px",
              color: "#02040e",
              fontSize: 15,
            }}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
