"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { OnboardingGuard } from "@/components/dashboard/OnboardingGuard";
import { ChatBot } from "@/components/ai/ChatBot";
import { AlertsDropdown } from "@/components/dashboard/AlertsDropdown";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnboardingGuard>
      <div className="flex min-h-screen bg-[#050505]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto w-full relative">
          {/* Padding top for mobile header */}
          <div className="pt-14 lg:pt-0">
            <div className="container mx-auto p-4 lg:p-8 max-w-7xl">{children}</div>
          </div>
          {/* Alerts dropdown - top right */}
          <div className="fixed top-4 right-20 z-40 hidden lg:block">
            <AlertsDropdown />
          </div>
        </main>
        {/* AI Chatbot - floating */}
        <ChatBot />
      </div>
    </OnboardingGuard>
  );
}
