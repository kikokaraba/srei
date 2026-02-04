"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

async function checkOnboarding(): Promise<boolean> {
  try {
    const response = await fetch("/api/v1/user/preferences", {
      credentials: "include",
    });

    if (!response.ok) {
      // 401: not signed in – middleware will redirect to sign-in
      if (response.status === 401) return false;
      // 500: treat as incomplete so user can continue to onboarding
      if (response.status === 500) {
        const body = await response.json().catch(() => ({}));
        if (process.env.NODE_ENV === "development" && body?.details) {
          console.warn("Onboarding check failed (500):", body.details);
        }
        return false;
      }
      return false;
    }

    const data = await response.json();

    if (!data.success) {
      return false;
    }

    if (!data.data) {
      return false;
    }

    return data.data.onboardingCompleted === true;
  } catch {
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
        <div className="text-zinc-400">Načítavam...</div>
      </div>
    );
  }

  return <>{children}</>;
}
