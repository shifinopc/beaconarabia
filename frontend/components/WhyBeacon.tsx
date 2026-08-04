import Image from "next/image";
import { mediaUrl, type StrapiImage } from "@/lib/strapi";

const BEACON_VALUES = [
  {
    img: "/NewSvgs/SVG1/hh/MaskGroup1.svg",
    heading: "Customer Centric",
    description:
      "We understand the customers and consider their expectations to align the services with their needs.",
  },
  {
    img: "/NewSvgs/SVG1/hh/MaskGroup4.svg",
    heading: "global perspective",
    description:
      "Our team considers the business concerns and resolves them while addressing them on a global level.",
  },
  {
    img: "/NewSvgs/SVG1/hh/MaskGroup6.svg",
    heading: "Collaborative Approach",
    description:
      "With collaboration, we equip businesses to face real-world challenges and retain relationships.",
  },
  {
    img: "/NewSvgs/SVG1/hh/MaskGroup3.svg",
    heading: "Communication",
    description:
      "We adopt the process of sharing ideas and developing solutions based on the client's needs.",
  },
  {
    img: "/NewSvgs/SVG1/hh/MaskGroup5.svg",
    heading: "Dedicated Teams",
    description:
      "Our team dedicatedly works on project realization right from the beginning to the final deployment.",
  },
  {
    img: "/NewSvgs/SVG1/hh/MaskGroup2.svg",
    heading: "Ease of Setup",
    description:
      "With us, your business setup is never going to be a hassle— it becomes as easy as a pie!",
  },
];

/**
 * Ported from bg-Beacon/src/app/components/WhyBeacon.js.
 *
 * Uses this section's own class set (beaconMainContainer / beaconContainer /
 * beaconimgContainer / beaconContentContainer) — icon beside the heading with
 * the description below — NOT the Services card classes. Heading casing is left
 * exactly as the original data ("global perspective"); the live site
 * title-cases it via CSS text-transform.
 */
export default function WhyBeacon({
  section,
}: {
  /**
   * Optional `why-beacon` Section. Seeded against global and inherited by the
   * regional sites, so the band is editable without a deploy while the arrays
   * below stay as the offline fallback.
   */
  section?: {
    eyebrow?: string | null;
    title: string;
    description?: string | null;
    cards?: { id: number; title: string; description?: string | null; image?: StrapiImage | null }[] | null;
  };
} = {}) {
  const eyebrow = section?.eyebrow ?? "Why Beacon?";
  const title =
    section?.title ??
    "Redefine your business with endless transformation possibilities";
  const values = section?.cards?.length
    ? section.cards.map((c) => ({
        img: mediaUrl(c.image) ?? "",
        heading: c.title,
        description: c.description ?? "",
      }))
    : BEACON_VALUES;

  return (
    <div className="whyBeaconContainer">
      <div className="whyBeaconContentsContainer">
        <div className="whyBeaconLeft">
          <p className="businessHeading">{eyebrow}</p>
        </div>
        <div className="whyBeaconRight">
          <h2 className="whyBeaconHeading">{title}</h2>
          {section?.description ? (
            <p className="whyBeaconDesc">{section.description}</p>
          ) : (
            <>
              <p className="whyBeaconDesc">
                Many businesses dream of entering the market, but navigating the
                complexities can feel overwhelming. At Beacon Global, we understand
                your struggles. We&apos;re not just consultants; we&apos;re your
                trusted partner.
              </p>
              <br />
              <p className="whyBeaconDesc">
                Our team of seasoned professionals has a proven track record of
                helping businesses like yours overcome obstacles and achieve
                remarkable success in the GCC. We don&apos;t offer generic solutions
                we tailor our strategies to your unique goals and challenges
              </p>
            </>
          )}
        </div>
      </div>

      <div className="whyBeaconImgContainer">
        {/*
          Deliberately not `priority`. These are decorative backgrounds for a
          band well below the fold, but `priority` preloads them into <head> —
          bg3.png alone is 146 KB, four times the hero image it was competing
          with for mobile bandwidth. Without it they load lazily, which is what
          a below-fold background should do.
        */}
        <Image
          className="desktop"
          src="/NewSvgs/Backgrounds/bg6.webp"
          width={1049}
          height={434}
          alt=""
          sizes="100vw"
          style={{ width: "100%", height: "auto" }}
          quality={100}
          unoptimized
        />
        <Image
          className="mobile"
          src="/NewSvgs/Backgrounds/bg3.png"
          width={1049}
          height={434}
          alt=""
          sizes="100vw"
          style={{ width: "100%", height: "auto" }}
          quality={100}
          unoptimized
        />
      </div>

      <div className="beaconMainContainer">
        {values.map((value) => (
          <div className="beaconContainer" key={value.heading}>
            <div className="beaconimgContainer">
              <Image
                className="becaonIconImg"
                src={value.img}
                width={60}
                height={40}
                alt=""
                quality={100}
                unoptimized
              />
            </div>
            <div className="beaconContentContainer">
              <div className="beaconHeadingContainer">
                <h3 className="beaconHeading">{value.heading}</h3>
              </div>
              <div className="beaconDescContainer">
                <p className="beaconDesc">{value.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
