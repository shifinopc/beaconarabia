import Image from "next/image";
import type { Region } from "@/lib/regions";
import CtaButton from "./CtaButton";

/**
 * "Expanding Opportunities Across the GCC" section.
 * Ported from bg-Beacon/src/app/components/Locations.js; the removed
 * `layout="responsive"` prop is replaced with sizes + style.
 */
export default function Locations({
  region,
  section,
}: {
  region: Region;
  /** Optional `home-locations` Section — the UAE site worded this band its own way. */
  section?: { title: string; description?: string | null };
}) {
  const base = region.segment ? `/${region.segment}` : "";
  const title = section?.title ?? "Expanding Opportunities Across the GCC";
  const description =
    section?.description ??
    "Our strategic presence throughout the GCC enables us to provide localized expertise and insights, ensuring your business thrives in each market. From Saudi Arabia to Oman, we offer tailored solutions that align with regional dynamics and drive sustainable growth. Wherever your business takes you in the GCC, our team is positioned to guide you at every stage.";

  return (
    <div className="locationContainer">
      <div className="locationFlexContainer">
        <div className="locationContentContainer">
          <div>
            <h2 className="locationHeading">{title}</h2>
          </div>
          <div>
            <p className="locationDesc">{description}</p>
          </div>
          <div>
            <CtaButton content="Explore More" href={`${base}/about`} />
          </div>
        </div>

        <div className="locationImgContainer">
          <Image
            src="/location.png"
            width={606}
            height={527}
            alt=""
            sizes="(max-width: 768px) 100vw, 606px"
            style={{ width: "100%", height: "auto" }}
          />
        </div>
      </div>
    </div>
  );
}
