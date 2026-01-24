"use client";

import { PropertyList } from "@/components/dashboard/PropertyList";
import { PageHeader } from "@/components/ui/PageHeader";
import { Building2, Search, Filter } from "lucide-react";

export default function PropertiesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Vyhľadávanie nehnuteľností"
        description="Pokročilé filtrovanie a vyhľadávanie slovenských nehnuteľností"
        icon={Building2}
        color="emerald"
        features={[
          { icon: Search, label: "Smart Search" },
          { icon: Filter, label: "Pokročilé filtre" },
        ]}
      />
      <PropertyList />
    </div>
  );
}
