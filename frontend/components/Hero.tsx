import Image from "next/image";
import type { Region } from "@/lib/regions";
import { getHomepage, mediaUrl } from "@/lib/strapi";
import CtaButton from "./CtaButton";

/** Fallbacks matching the legacy copy, used until a Homepage entry exists. */
const DEFAULTS: Record<string, { title: string; description: string }> = {
  global: {
    title: "Your Global Advisory Partner For Business Success",
    description:
      "Launching a business demands expertise and a strong foundation for competitive edge. We provide top-notch business consulting services, offering practical strategies that align with global business standards.",
  },
  ae: {
    title: "Launch Your Business In UAE With Our Expertise",
    description:
      "We help you fulfill your entrepreneurial journey and dream business setup in UAE with support on tax and accounting to legal support and marketing.",
  },
  sa: {
    title: "The Future Is Here. Be Part Of It.",
    description:
      "Starting a business in KSA can be challenging without proper assistance. From setting up your company to maintaining corporate governance, you need reliable support to navigate these complexities.",
  },
};

/**
 * Ported from bg-Beacon/src/app/components/Hero.js.
 *
 * The legacy version hardcoded the headline and description in JSX and used the
 * removed `layout="responsive"` prop. Content now comes from the Homepage
 * content type (falling back to the original copy per region), and sizing uses
 * the modern `sizes` + `style` approach instead of `layout`.
 */
export default async function Hero({ region }: { region: Region }) {
  const cms = await getHomepage(region.strapiValue);
  const fallback = DEFAULTS[region.key] ?? DEFAULTS.global;

  const title = cms?.heroTitle ?? fallback.title;
  const description = cms?.heroDescription ?? fallback.description;
  const ctaLabel = cms?.heroCtaLabel ?? "Contact Us";
  const base = region.segment ? `/${region.segment}` : "";
  const ctaHref = cms?.heroCtaHref ?? `${base}/contact`;

  const desktopImage = mediaUrl(cms?.heroImage) ?? "/hero.webp";
  const mobileImage = mediaUrl(cms?.heroImageMobile) ?? "/MobileHero.webp";

  return (
    <div className="heroContainer">
      <div className="imageWithText">
        <Image
          className="hImage"
          src={desktopImage}
          alt=""
          width={1366}
          height={670}
          sizes="100vw"
          style={{ width: "100%", height: "auto" }}
          quality={100}
          priority
          unoptimized
        />
        <Image
          className="MobilehImage"
          src={mobileImage}
          alt=""
          width={768}
          height={600}
          sizes="100vw"
          style={{ width: "100%", height: "auto" }}
          quality={100}
          priority
          unoptimized
        />

        <div className="textOverlay">
          <div>
            <h1 className="heorHeading">{title}</h1>
          </div>
          <div className="heroDescContainer">
            <p className="heroDesc">{description}</p>
            <p className="mHeroDesc">{description}</p>
          </div>
          <div>
            <CtaButton content={ctaLabel} href={ctaHref} />
          </div>
        </div>
      </div>
    </div>
  );
}
