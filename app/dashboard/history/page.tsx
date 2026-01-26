"use client";

import { MarketHistory } from "@/components/dashboard/MarketHistory";
import { PageHeader } from "@/components/ui/PageHeader";
import { TrendingUp, BarChart3, Clock } from "lucide-react";

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Vývoj trhu"
        description="Historické dáta a trendy cien nehnuteľností"
        icon={TrendingUp}
        color="violet"
        features={[
          { icon: BarChart3, label: "Cenové trendy" },
          { icon: Clock, label: "História predajov" },
        ]}
      />
      <MarketHistory />
    </div>
  );
}
