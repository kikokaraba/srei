import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/landing/Navbar";
import { LandingHero } from "@/components/landing/Hero";
import { Stats } from "@/components/landing/Stats";
import { Pricing } from "@/components/landing/Pricing";
import { Testimonials } from "@/components/landing/Testimonials";
import { LiveDataIndicator } from "@/components/landing/LiveDataIndicator";
import { CompetitiveAdvantage } from "@/components/landing/CompetitiveAdvantage";

// Lazy load heavy components for better initial load performance
const LandingMap = dynamic(
  () => import("@/components/landing/LandingMap").then((mod) => ({ default: mod.LandingMap })),
  {
    ssr: false,
    loading: () => (
      <div className="py-24 bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="container mx-auto px-6">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-16 min-h-[400px] flex items-center justify-center">
            <div className="text-slate-400">Načítavam mapu...</div>
          </div>
        </div>
      </div>
    ),
  }
);

const Features = dynamic(
  () => import("@/components/landing/Features").then((mod) => ({ default: mod.Features })),
  { ssr: true }
);

const CTA = dynamic(
  () => import("@/components/landing/CTA").then((mod) => ({ default: mod.CTA })),
  { ssr: true }
);

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
        <LandingMap />
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
