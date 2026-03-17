"use client";

import { PropsWithChildren, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/apiError";
import { SearchProvider } from "@/components/providers/search";

export default function AppProviders({ children }: PropsWithChildren) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // 4xx обычно не ретраим
              if (
                error instanceof ApiError &&
                error.status >= 400 &&
                error.status < 500
              )
                return false;
              return failureCount < 2;
            },
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <SearchProvider>{children}</SearchProvider>
    </QueryClientProvider>
  );
}
