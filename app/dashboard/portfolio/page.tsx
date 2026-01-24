"use client";

import { Portfolio } from "@/components/dashboard/Portfolio";
import { PageHeader } from "@/components/ui/PageHeader";
import { Briefcase, TrendingUp, PieChart } from "lucide-react";

export default function PortfolioPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Moje portfólio"
        description="Spravujte svoje nehnuteľnosti a sledujte výkonnosť investícií"
        icon={Briefcase}
        color="violet"
        features={[
          { icon: TrendingUp, label: "Výkonnosť" },
          { icon: PieChart, label: "Prehľad" },
        ]}
      />
      <Portfolio />
    </div>
  );
}
