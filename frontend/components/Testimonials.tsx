"use client";

import { useState } from "react";

export interface TestimonialItem {
  message: string;
  name: string;
  designation?: string;
}

/** Used only if the CMS has no testimonials for this region. */
const FALLBACK_TESTIMONIALS: TestimonialItem[] = [
  {
    message:
      "Beacon has been with us throughout the phase of integrating and adapting business to the dynamic marketplace, with end-to-end business consultation services.",
    name: "Usman Tariq",
    designation: " Riyadh, KSA",
  },
  {
    message:
      "While partnering with Beacon, we never felt them as the business consultants, but as a part of our team with transparency and commitment at its best.",
    name: "Hassan",
    designation: " Jeddah, KSA",
  },
  {
    message:
      "Working with Beacon made setting up our business in Saudi Arabia hassle-free. Their comprehensive services covered everything from paperwork to best business suggestions, ensuring a smooth and successful expansion.",
    name: "Mohammed Al-Saud",
    designation: " Jeddah, KSA",
  },
  {
    message:
      "Working with Beacon felt like having an extended team member. Their transparency and unwavering commitment made the partnership seamless and productive.",
    name: " Ahmed Al-Sayed",
    designation: " Dubai , UAE",
  },
  {
    message:
      "Beacon's guidance and expertise have been instrumental in our business's growth and success. Their tailored solutions and dedicated support have exceeded our expectations.",
    name: "Abdul Rasheed",
    designation: " Dammam, KSA",
  },
  {
    message:
      "Choosing Beacon was one of the best decisions we made for our business. Their strategic insights and proactive approach have been pivotal in our journey towards success.",
    name: "Reem Abdullah",
    designation: " Riyadh, KSA",
  },
];

/**
 * Testimonial carousel.
 *
 * The legacy code had this block twice — once in Clients.js (homepage) and once
 * in the Services page — with the same six testimonials copy-pasted into both.
 * Extracted here so the quotes live in one place.
 *
 * The Services page layers extra CSS-module classes onto the wrapper and left
 * column, hence the optional class props.
 */
export default function Testimonials({
  wrapperClassName = "",
  leftClassName = "",
  mobileHeadingClassName = "mTestimonialHeading",
  section,
  items,
}: {
  wrapperClassName?: string;
  leftClassName?: string;
  mobileHeadingClassName?: string;
  /** From the CMS; falls back to the original quotes when empty. */
  items?: TestimonialItem[];
  /** Optional `testimonials-heading` Section — the regional sites reworded this band. */
  section?: { title: string; eyebrow?: string | null; description?: string | null };
}) {
  const quotes = items?.length ? items : FALLBACK_TESTIMONIALS;
  const [index, setIndex] = useState(0);
  const current = quotes[index % quotes.length];
  const step = (delta: number) =>
    setIndex((i) => (i + delta + quotes.length) % quotes.length);

  const heading = section?.title ?? "What our clients say about us";

  return (
    <div className={`${wrapperClassName} testimonialMainContainer`.trim()}>
      <div className={`${leftClassName} testimonialLeftContainer`.trim()}>
        <h2 className="testimonialHeading">{heading}</h2>
          <h2 className={mobileHeadingClassName}>{heading}</h2>
        <p className="testimonialDesc">
            {section?.description ??
              "Let’s hear from our clients, the core of whatever we commit."}
          </p>
      </div>

      <div className="testimonialRightContainer">
        <div className="testimonialMessage">
          <h3>&quot;{current.message}&quot;</h3>
        </div>
        <div className="testimonialImageButtonContainer">
          <div className="testimonialProfile">
            <div
              style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}
            >
              <p className="profileName">{current.name}</p>
              <p className="profileDesignation">{current.designation}</p>
            </div>
          </div>
          <div className="testimonialButtonContainer">
            <button
              className="leftButton"
              onClick={() => step(-1)}
              aria-label="Previous testimonial"
            >
              {"<"}
            </button>
            <button
              className="rightButton"
              onClick={() => step(1)}
              aria-label="Next testimonial"
            >
              {">"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
