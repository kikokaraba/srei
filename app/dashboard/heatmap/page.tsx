import { SlovakiaHeatmap } from "@/components/dashboard/SlovakiaHeatmap";

export default function HeatmapPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-100 mb-2">
          Investičná Heatmapa Slovenska
        </h1>
        <p className="text-slate-400">
          Interaktívna mapa zobrazujúca investičnú atraktivitu podľa regiónov
        </p>
      </div>

      <SlovakiaHeatmap />
    </div>
  );
}
