"use client";

import { useState, useEffect, ReactNode } from "react";
import { ListingModeContext, type ListingMode } from "@/lib/hooks/useListingMode";

const STORAGE_KEY = "sria-listing-mode";

export function ListingModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ListingMode>("PREDAJ");
  const [isHydrated, setIsHydrated] = useState(false);

  // Načítaj z localStorage pri mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "PREDAJ" || stored === "PRENAJOM") {
      setModeState(stored);
    }
    setIsHydrated(true);
  }, []);

  // Ulož do localStorage pri zmene
  const setMode = (newMode: ListingMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  };

  const toggleMode = () => {
    setMode(mode === "PREDAJ" ? "PRENAJOM" : "PREDAJ");
  };

  const value = {
    mode,
    setMode,
    toggleMode,
    isBuying: mode === "PREDAJ",
    isRenting: mode === "PRENAJOM",
  };

  // Počkaj na hydration aby sa vyhol hydration mismatch
  if (!isHydrated) {
    return <>{children}</>;
  }

  return (
    <ListingModeContext.Provider value={value}>
      {children}
    </ListingModeContext.Provider>
  );
}
