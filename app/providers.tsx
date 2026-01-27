"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";
import { ToastContainer } from "@/components/ui/Toast";
import { ListingModeProvider } from "@/components/ListingModeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ListingModeProvider>
          {children}
        </ListingModeProvider>
        <ToastContainer />
      </QueryClientProvider>
    </SessionProvider>
  );
}
