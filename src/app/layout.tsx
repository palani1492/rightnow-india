import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr";
import "./globals.css";

export const metadata: Metadata = {
  title: "RightNow India | Whatever changed, start here",
  description:
    "RightNow India helps you describe any life situation in your own words, understand what applies, and prepare to act across services like Passport Seva, UIDAI, DigiLocker, UMANG and Parivahan.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="prototype-bar">
          <ShieldCheckIcon aria-hidden="true" size={15} weight="fill" />
          <span>RightNow India is an independent civic-assistance product and is not affiliated with the Government of India.</span>
          <Link href="/built-with-codex">Built with Codex</Link>
        </div>
        {children}
      </body>
    </html>
  );
}
