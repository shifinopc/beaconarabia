import Image from "next/image";
import Link from "next/link";
import { REGIONS } from "@/lib/regions";
import { mediaUrl, type StrapiImage } from "@/lib/strapi";

/**
 * "A breakdown of our global presence" — the KSA / UAE cards.
 *
 * Ported from bg-Beacon/src/app/components/BusinessSetup.js. The originals were
 * `<a target="_blank">` links to https://ksa.beaconarabia.com and
 * https://uae.beaconarabia.com; they are now internal /sa and /ae routes, so
 * this section becomes real internal navigation instead of cross-domain exits.
 */
const CARDS = [
  {
    key: REGIONS.sa.key,
    href: `/${REGIONS.sa.segment}`,
    className: "ksa",
    image: "/KSA.webp",
    label: "KSA",
    description:
      "Delve into our realm of business setup, incorporation, formation and business consulting services in Saudi Arabia.",
  },
  {
    key: REGIONS.ae.key,
    href: `/${REGIONS.ae.segment}`,
    className: "uae",
    image: "/UAE.webp",
    label: "UAE",
    description:
      "Our practical insights and strategies help you with the entire spectrum of business management solutions in the UAE.",
  },
];

export default function BusinessSetup({
  section,
}: {
  /** Optional `business-setup` Section — heading and the two region cards. */
  section?: {
    eyebrow?: string | null;
    title: string;
    cards?: { id: number; title: string; description?: string | null; image?: StrapiImage | null }[] | null;
  };
} = {}) {
  const eyebrow = section?.eyebrow ?? "Explore";
  const title =
    section?.title ??
    "A breakdown of our global presence to scale your business growth";
  /**
   * CMS cards keep the hardcoded href and layout class, matched by position:
   * these two cards are the KSA and UAE routes and are not a list an editor adds
   * to. Only the label, copy and image are content.
   */
  const cards = section?.cards?.length
    ? section.cards.slice(0, CARDS.length).map((c, i) => ({
        ...CARDS[i],
        label: c.title,
        description: c.description ?? CARDS[i].description,
        image: mediaUrl(c.image) ?? CARDS[i].image,
      }))
    : CARDS;

  return (
    <div className="bussinessContainer">
      <div className="businessContentContainer">
        <p className="businessHeading">{eyebrow}</p>
        <h2 className="businessDesc">{title}</h2>
        <h2 className="mBusinessDesc">{title}</h2>
      </div>

      <div className="businessVideoContainer">
        {cards.map((card) => (
          <div className={card.className} key={card.key}>
            <Link href={card.href}>
              <Image
                src={card.image}
                width={586}
                height={300}
                alt=""
                className="ImageBusiness"
                sizes="(max-width: 768px) 100vw, 586px"
                style={{ width: "100%", height: "auto" }}
                quality={100}
                unoptimized
              />
              <div className="businessCardContentContainer">
                <h3 className="ksaHeading">{card.label}</h3>
                <p className="ksaDesc">{card.description}</p>
                <div className="businessCircle">
                  <Image
                    src="/whiteArrow.svg"
                    width={20}
                    height={19}
                    alt=""
                    quality={100}
                    unoptimized
                  />
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
