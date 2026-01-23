import { CustomizableDashboard } from "@/components/dashboard/CustomizableDashboard";
import { AdvancedFilters } from "@/components/dashboard/AdvancedFilters";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <AdvancedFilters />
      <CustomizableDashboard />
    </div>
  );
}
