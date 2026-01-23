"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

async function checkOnboarding() {
  try {
    const response = await fetch("/api/v1/user/preferences", {
      credentials: "include", // Ensure cookies are sent
    });
    
    if (!response.ok) {
      console.error("Failed to check onboarding status:", response.status, response.statusText);
      // If unauthorized, user should be redirected to sign in by middleware
      return false;
    }
    
    const data = await response.json();
    
    if (!data.success) {
      console.error("API returned error:", data.error);
      return false;
    }
    
    // If preferences don't exist, onboarding is not completed
    if (!data.data) {
      return false;
    }
    
    return data.data.onboardingCompleted === true;
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return false;
  }
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
