import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { L } from "@/components/L";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "syravocado",
    template: "%s · syravocado",
  },
  description:
    "syravocado — weekday global and China financial briefings from sourced desks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fraunces.variable} ${manrope.variable} antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var q=new URLSearchParams(location.search).get("lang");var l=q==="zh"||q==="en"?q:"en";document.documentElement.dataset.lang=l;document.documentElement.lang=l==="zh"?"zh-CN":"en";})();`,
          }}
        />
        <a href="#main-content" className="skip-link focus-ring">
          <L en="Skip to content" zh="跳到正文" />
        </a>
        <div className="site-shell">
          <SiteHeader />
          <main id="main-content">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
