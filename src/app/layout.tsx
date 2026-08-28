import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr";
import "./globals.css";

export const metadata: Metadata = {
  title: "RightNow India | One conversation. Every public service.",
  description:
    "An independent prototype that prepares public-service actions around life changes using synthetic data.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="prototype-bar">
          <ShieldCheckIcon aria-hidden="true" size={15} weight="fill" />
          <span>Independent prototype. Synthetic data only. No government systems are connected.</span>
          <Link href="/built-with-codex">Built with Codex</Link>
        </div>
        {children}
      </body>
    </html>
  );
}

