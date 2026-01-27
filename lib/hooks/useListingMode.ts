"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ListingMode = "PREDAJ" | "PRENAJOM";

interface ListingModeContextType {
  mode: ListingMode;
  setMode: (mode: ListingMode) => void;
  toggleMode: () => void;
  isBuying: boolean;
  isRenting: boolean;
}

const ListingModeContext = createContext<ListingModeContextType | undefined>(undefined);

export function useListingMode() {
  const context = useContext(ListingModeContext);
  if (!context) {
    // Fallback pre prípad, že provider nie je dostupný
    return {
      mode: "PREDAJ" as ListingMode,
      setMode: () => {},
      toggleMode: () => {},
      isBuying: true,
      isRenting: false,
    };
  }
  return context;
}

export { ListingModeContext };
