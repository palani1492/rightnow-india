import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr";
import "./globals.css";

export const metadata: Metadata = {
  title: "RightNow India | Whatever changed, start here",
  description:
    "An independent AI-routed prototype that turns any life situation into a reviewable simulation using synthetic data.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="prototype-bar">
          <ShieldCheckIcon aria-hidden="true" size={15} weight="fill" />
          <span>Independent prototype. Synthetic data. No government connections.</span>
          <Link href="/built-with-codex">Built with Codex</Link>
        </div>
        {children}
      </body>
    </html>
  );
}
