import { AnalyticsCards } from "@/components/dashboard/AnalyticsCards";
import { MarketOverview } from "@/components/dashboard/MarketOverview";
import { RecentProperties } from "@/components/dashboard/RecentProperties";
import { MarketGaps } from "@/components/dashboard/MarketGaps";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-100 mb-2">
          Investičný Dashboard
        </h1>
        <p className="text-slate-400">
          Real-time trhová inteligencia pre slovenské nehnuteľnosti
        </p>
      </div>

      <AnalyticsCards />
      <MarketGaps />
      <MarketOverview />
      <RecentProperties />
    </div>
  );
}
