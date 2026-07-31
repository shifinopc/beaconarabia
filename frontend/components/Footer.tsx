import Image from "next/image";
import Link from "next/link";
import type { Region } from "@/lib/regions";
import { loadSiteInfo } from "@/lib/site";
import NewsLetter from "./NewsLetter";

/**
 * Ported from bg-Beacon/src/app/components/Footer.js.
 *
 * The newsletter block renders inside the footer, above the divider — that is
 * where the legacy markup puts it, and where the live site shows it.
 *
 * Links are region-aware; contact details and socials come from lib/site.ts
 * rather than being inlined in JSX as they were in all three legacy repos.
 */
export default async function Footer({ region }: { region: Region }) {
  const SITE = await loadSiteInfo();
  const base = region.segment ? `/${region.segment}` : "";

  const links = [
    { text: "Home", href: base || "/" },
    { text: "About Us", href: `${base}/about` },
    { text: "Services", href: `${base}/services` },
    { text: "Blogs", href: `${base}/blog` },
    { text: "Partners", href: `${base}/partners` },
    { text: "Careers", href: `${base}/careers` },
    { text: "Contact", href: `${base}/contact` },
  ];

  return (
    <div className="footerContainer">
      <div>
        <NewsLetter region={region} />
      </div>

      <div className="topContainer">
        <div className="footerLogoContainer">
          <Image
            src="/NewSvgs/Logos/beaconWhite.svg"
            width={170}
            height={60}
            alt="Beacon"
            quality={100}
            unoptimized
          />
        </div>
        <div className="footerContentContainer">
          <ul className="footercontent">
            {links.map((item) => (
              <Link key={item.text} href={item.href}>
                <p>{item.text}</p>
              </Link>
            ))}
          </ul>
        </div>
      </div>

      <div className="bottomContainer">
        <div className="footerContactImgContainer">
          <div className="footerContactDetails">
            <Image
              src="/NewSvgs/SVG3/hh/Icon-1.svg"
              width={46}
              height={46}
              alt=""
              quality={100}
              unoptimized
            />
            <div className="footerContactTextDetails footerContactTextDetailsEmail">
              <h3>Email us:</h3>
              <a href={`mailto:${SITE.email}`} style={{ textTransform: "none" }}>
                {SITE.email}
              </a>
            </div>
          </div>

          <div className="footerContactDetails">
            <Image
              src="/NewSvgs/SVG3/hh/Icon.svg"
              width={46}
              height={46}
              alt=""
              quality={100}
              unoptimized
            />
            <div className="footerContactTextDetails" style={{ whiteSpace: "nowrap" }}>
              <h3>Call us on:</h3>
              <a href={`tel:${SITE.phones[0].replace(/\s/g, "")}`}>
                <p>
                  {SITE.phones[0]}
                  <br /> {SITE.phones[1]}
                </p>
              </a>
            </div>
          </div>

          <div className="footerContactDetails">
            <Image
              src="/NewSvgs/SVG3/hh/Icon-2.svg"
              width={46}
              height={46}
              alt=""
              quality={100}
              unoptimized
            />
            <a href={SITE.office.mapUrl} target="_blank" rel="noreferrer">
              <div className="footerContactTextDetails">
                <h3>Head Office:</h3>
                <p>
                  {SITE.office.lines[0]}
                  <br /> {SITE.office.lines[1]}
                </p>
              </div>
            </a>
          </div>
        </div>

        <div className="footerSocialContainer">
          {SITE.social.map((s) => (
            <a key={s.name} href={s.href} target="_blank" rel="noreferrer">
              <Image
                className="socialIcons"
                src={s.icon}
                width={46}
                height={46}
                alt={s.name}
                quality={100}
                unoptimized
              />
            </a>
          ))}
        </div>
      </div>

      <div className="footerCopyRightContainer">
        <p className="footerCopyRight">
          © {new Date().getFullYear()} by {SITE.copyrightHolder} | All Right Reserved |
          Powered by{" "}
          <a href="https://procube.cx/" style={{ textDecoration: "underline" }}>
            procube.cx
          </a>
        </p>
      </div>
    </div>
  );
}
