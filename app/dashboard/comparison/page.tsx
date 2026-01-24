import { PropertyComparison } from "@/components/dashboard/PropertyComparison";

export default function ComparisonPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-100 mb-2">
          Porovnanie nehnuteľností
        </h1>
        <p className="text-slate-400">
          Porovnajte až 3 nehnuteľnosti s 10-ročnými projekciami ROI
        </p>
      </div>

      <PropertyComparison />
    </div>
  );
}
