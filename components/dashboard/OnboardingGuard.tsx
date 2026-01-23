"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

async function checkOnboarding() {
  const response = await fetch("/api/v1/user/preferences");
  const data = await response.json();
  return data.success && data.data?.onboardingCompleted === true;
}

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  const { data: onboardingCompleted } = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: checkOnboarding,
    retry: false,
  });

  useEffect(() => {
    if (onboardingCompleted === false) {
      router.push("/onboarding");
    } else if (onboardingCompleted === true) {
      setIsChecking(false);
    }
  }, [onboardingCompleted, router]);

  if (isChecking || onboardingCompleted === false) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-400">Načítavam...</div>
      </div>
    );
  }

  return <>{children}</>;
}
