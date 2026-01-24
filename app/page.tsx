import type { Metadata } from "next";
import { Navbar } from "@/components/landing/Navbar";
import { LandingHero } from "@/components/landing/Hero";
import { Stats } from "@/components/landing/Stats";
import { Pricing } from "@/components/landing/Pricing";
import { Testimonials } from "@/components/landing/Testimonials";
import { LiveDataIndicator } from "@/components/landing/LiveDataIndicator";
import { CompetitiveAdvantage } from "@/components/landing/CompetitiveAdvantage";
import { LandingMapWrapper } from "@/components/landing/LandingMapWrapper";
import { Features } from "@/components/landing/Features";
import { CTA } from "@/components/landing/CTA";

export const metadata: Metadata = {
  title: "SRIA - Slovenská Realitná Investičná Aplikácia | Investujte inteligentne",
  description:
    "Prémiová platforma pre investovanie do nehnuteľností na slovenskom trhu. Real-time analýzy, AI predikcie a pokročilé metriky pre maximálny výnos.",
  keywords: [
    "investície do nehnuteľností",
    "slovensko",
    "real estate",
    "investičná platforma",
    "nehnuteľnosti",
    "výnos",
    "ROI",
    "Bratislava",
    "Košice",
  ],
  openGraph: {
    title: "SRIA - Slovenská Realitná Investičná Aplikácia",
    description:
      "Prémiová platforma pre investovanie do nehnuteľností na slovenskom trhu",
    type: "website",
    locale: "sk_SK",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950">
      <Navbar />
      <LandingHero />
      <Stats />
      <section id="map" aria-label="Interaktívna mapa Slovenska">
        <LandingMapWrapper />
      </section>
      <section id="features" aria-label="Funkcie platformy">
        <Features />
      </section>
      <section id="why-sria" aria-label="Prečo SRIA">
        <CompetitiveAdvantage />
      </section>
      <Testimonials />
      <Pricing />
      <CTA />
      <LiveDataIndicator />
    </main>
  );
}
