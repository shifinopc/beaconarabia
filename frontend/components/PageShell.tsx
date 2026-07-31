import type { Region } from "@/lib/regions";
import Header from "./Header";
import MobileHeader from "./MobileHeader";
import WhatsAppChat from "./WhatsAppChat";
import Footer from "./Footer";

/**
 * Header + Footer wrapper shared by every inner page.
 *
 * The legacy pages each imported Header/MobileHeader/Footer via next/dynamic
 * individually, repeating the same five imports in About, Services, Contact and
 * Careers. Centralising it means the shell is defined once.
 */
export default function PageShell({
  region,
  children,
}: {
  region: Region;
  children: React.ReactNode;
}) {
  return (
    <>
      <WhatsAppChat />
      <Header region={region} />
      <MobileHeader region={region} />
      <main className="mainContainer">{children}</main>
      <Footer region={region} />
    </>
  );
}
