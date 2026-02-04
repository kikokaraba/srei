"use client";

import { CustomizableDashboard } from "@/components/dashboard/CustomizableDashboard";
import { RentalDashboard } from "@/components/dashboard/RentalDashboard";
import { UrbanImpactAlert } from "@/components/dashboard/UrbanImpactAlert";
import { ListingModeToggle } from "@/components/ListingModeToggle";
import { LiveMarketTicker } from "@/components/dashboard/LiveMarketTicker";
import { useSession } from "next-auth/react";
import { useListingMode } from "@/lib/hooks/useListingMode";

export default function DashboardPage() {
  const { data: session } = useSession();
  const { isBuying } = useListingMode();
  const userName = session?.user?.name?.split(" ")[0] || "Investor";

  return (
    <div className="space-y-8">
      {/* Premium Header - Minimal */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        {/* Welcome Text */}
        <div>
          <p className="text-zinc-500 text-sm font-medium tracking-wide mb-1">
            {isBuying ? "INVESTIČNÝ DASHBOARD" : "NÁJOMNÝ DASHBOARD"}
          </p>
          <h1 className="text-2xl lg:text-3xl font-semibold text-zinc-100 tracking-tight">
            Vitaj späť, {userName}
          </h1>
        </div>
        
        {/* Mode Toggle + Live Market Ticker (real data from scraped listings) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <ListingModeToggle />
          <LiveMarketTicker />
        </div>
      </div>

      {/* Urban Impact Alert - len pre investičný režim */}
      {isBuying && <UrbanImpactAlert />}

      {/* Investičný: widgety; Nájomný: priemerné nájmy a filtre */}
      {isBuying ? <CustomizableDashboard /> : <RentalDashboard />}
    </div>
  );
}
