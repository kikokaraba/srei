"use client";

import { WatchdogSettings } from "@/components/dashboard/WatchdogSettings";
import { PageHeader } from "@/components/ui/PageHeader";
import { Eye, Bell, Filter } from "lucide-react";

export default function WatchdogPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Strážny pes"
        description="Nastav si vlastné kritériá a budem ťa upozorňovať na výhodné ponuky"
        icon={Eye}
        color="amber"
        features={[
          { icon: Filter, label: "Vlastné filtre" },
          { icon: Bell, label: "Notifikácie" },
        ]}
      />
      <WatchdogSettings />
    </div>
  );
}
