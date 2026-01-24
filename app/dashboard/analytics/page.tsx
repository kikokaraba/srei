import { AnalyticsDashboard } from "@/components/dashboard/AnalyticsDashboard";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-100 mb-2">
          Trhová analytika
        </h1>
        <p className="text-slate-400">
          Hlboký pohľad na trhové trendy a výkonnostné metriky
        </p>
      </div>

      <AnalyticsDashboard />
    </div>
  );
}
