import type { Region } from "@/lib/regions";
import {
  getClients,
  getFaqs,
  getSections,
  getStats,
  getTestimonials,
  mediaUrl,
  sectionByKey,
} from "@/lib/strapi";
import Header from "./Header";
import MobileHeader from "./MobileHeader";
import WhatsAppChat from "./WhatsAppChat";
import IntroLoader from "./IntroLoader";
import Popup from "./Popup";
import Hero from "./Hero";
import Locations from "./Locations";
import BusinessSetup from "./BusinessSetup";
import Services from "./Services";
import WhyBeacon from "./WhyBeacon";
import Stats from "./Stats";
import Clients from "./Clients";
import SectionSplit from "./SectionSplit";
import SectionCards from "./SectionCards";
import BlogTeaser from "./BlogTeaser";
import Faq from "./Faq";
import ContactCta from "./ContactCta";
import Footer from "./Footer";

/**
 * The homepage, rendered once per region.
 *
 * Section order matches the legacy bg-Beacon/src/app/page.js:
 * Hero → Locations → BusinessSetup → Services → WhyBeacon → Stats → Clients →
 * Blog → FAQ → Contact → Footer.
 *
 * All three legacy sites reimplemented these same sections independently —
 * comparing them found only ONE byte-identical JS file between the global and
 * UAE repos. This is the consolidation: one implementation, content varying by
 * region via Strapi.
 *
 * The intro loader and the "Book a call with us" popup are part of the original
 * design and are restored here (IntroLoader, Popup).
 */
export default async function RegionHome({ region }: { region: Region }) {
  const [clients, faqs, stats, testimonials, sections] = await Promise.all([
    getClients(region.strapiValue),
    getFaqs(region.strapiValue),
    getStats(region.strapiValue),
    getTestimonials(region.strapiValue),
    getSections(region.strapiValue),
  ]);

  // Region-only blocks. A region without them renders the shared homepage
  // unchanged, so adding one is a CMS edit rather than a code change.
  const servicesHeading = sectionByKey(sections, "home-services");
  const investment = sectionByKey(sections, "home-investment");
  const cities = sectionByKey(sections, "home-cities");
  // UAE-only: the jurisdiction explainer and the emirate cards.
  const jurisdiction = sectionByKey(sections, "home-jurisdiction");
  const places = sectionByKey(sections, "home-places");
  // Wording overrides for bands the shared components otherwise hardcode.
  const locationsSection = sectionByKey(sections, "home-locations");
  const contactSection = sectionByKey(sections, "contact-cta");
  const testimonialsSection = sectionByKey(sections, "testimonials-heading");
  const whyBeaconSection = sectionByKey(sections, "why-beacon");
  const businessSetupSection = sectionByKey(sections, "business-setup");
  const clientsSection = sectionByKey(sections, "clients-heading");
  const blogSection = sectionByKey(sections, "blog-heading");
  const faqSection = sectionByKey(sections, "faq-heading");
  const ebookSection = sectionByKey(sections, "ebook-banner");

  // Falls back to the logo files shipped in public/ until logos are uploaded
  // to the CMS, so the strip is never empty during migration.
  const cmsLogos = clients.map((c) => mediaUrl(c.logo)).filter((u): u is string => Boolean(u));
  const logos = cmsLogos.length ? cmsLogos : FALLBACK_LOGOS;

  return (
    <>
      <IntroLoader />
      <Popup region={region} />
      <WhatsAppChat />
      <Header region={region} />
      <MobileHeader region={region} />

      <div className="mainContainer">
        <Hero region={region} />
        <Locations region={region} section={locationsSection} />
        <BusinessSetup section={businessSetupSection} />
        <Services region={region} heading={servicesHeading} />
        {/* Saudi's own homepage ran services → investment panel → city cards. */}
        {investment && <SectionSplit section={investment} />}
        {cities && <SectionCards section={cities} variant="overlay" />}
        {/* The UAE site ran services → jurisdiction → places. */}
        {jurisdiction && <SectionCards section={jurisdiction} />}
        {places && <SectionCards section={places} variant="overlay" />}
        <WhyBeacon section={whyBeaconSection} />
        <Stats stats={stats} />
        <Clients
          clients={clients}
          logos={logos}
          region={region}
          testimonials={testimonials}
          testimonialsSection={testimonialsSection}
          section={clientsSection}
          ebookSection={ebookSection}
        />
        <BlogTeaser region={region} section={blogSection} />
        <Faq entries={faqs} section={faqSection} />
        <ContactCta region={region} section={contactSection} />
        {/* NewsLetter renders inside Footer, as in the legacy markup. */}
        <Footer region={region} />
      </div>
    </>
  );
}

/**
 * The full logo set from the legacy design — all 17, in the original order.
 * Note the gaps (no logo7/8/14/16/19/21): that is intentional in the source,
 * not an omission. Used until logos are uploaded to the CMS.
 */
const FALLBACK_LOGOS = [
  "/clients/brands/webp/logo1.webp",
  "/clients/brands/webp/logo2.webp",
  "/clients/brands/webp/logo3.webp",
  "/clients/brands/webp/logo4.webp",
  "/clients/brands/webp/logo5.webp",
  "/clients/brands/webp/logo6.webp",
  "/clients/brands/webp/logo9.webp",
  "/clients/brands/webp/logo10.webp",
  "/clients/brands/webp/logo11.webp",
  "/clients/brands/webp/logo12.webp",
  "/clients/brands/webp/logo13.webp",
  "/clients/brands/webp/logo15.webp",
  "/clients/brands/webp/logo17.webp",
  "/clients/brands/webp/logo18.webp",
  "/clients/brands/webp/logo20.webp",
  "/clients/brands/webp/logo22.webp",
  "/clients/brands/webp/shami.webp",
];
