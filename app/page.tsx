import { Navbar } from "@/components/landing/Navbar";
import { LandingHero } from "@/components/landing/Hero";
import { SlovakiaMap } from "@/components/landing/SlovakiaMap";
import { Features } from "@/components/landing/Features";
import { Stats } from "@/components/landing/Stats";
import { CTA } from "@/components/landing/CTA";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950">
      <Navbar />
      <LandingHero />
      <Stats />
      <div id="map">
        <SlovakiaMap />
      </div>
      <div id="features">
        <Features />
      </div>
      <CTA />
    </main>
  );
}
