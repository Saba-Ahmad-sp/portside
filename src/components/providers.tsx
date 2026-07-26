"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";

import { getQueryClient } from "@/lib/get-query-client";

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast:
              "font-sans rounded-md border-border bg-card text-card-foreground",
            description: "text-muted-foreground",
          },
        }}
      />
    </QueryClientProvider>
  );
}
