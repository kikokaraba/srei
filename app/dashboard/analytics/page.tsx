"use client";

import { AnalyticsDashboard } from "@/components/dashboard/AnalyticsDashboard";
import { PageHeader } from "@/components/ui/PageHeader";
import { BarChart3, TrendingUp, Activity } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Trhová analytika"
        description="Hlboký pohľad na trhové trendy a výkonnostné metriky"
        icon={BarChart3}
        color="blue"
        features={[
          { icon: TrendingUp, label: "Trendy" },
          { icon: Activity, label: "Real-time dáta" },
        ]}
      />
      <AnalyticsDashboard />
    </div>
  );
}
