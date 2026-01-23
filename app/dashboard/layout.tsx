"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { OnboardingGuard } from "@/components/dashboard/OnboardingGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnboardingGuard>
      <div className="flex h-screen bg-slate-950">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6">{children}</div>
        </main>
      </div>
    </OnboardingGuard>
  );
}
