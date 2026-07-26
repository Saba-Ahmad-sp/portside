import { QueryClient, isServer } from "@tanstack/react-query";

/**
 * One QueryClient per request on the server, one singleton in the browser.
 *
 * A module-level client on the server would be shared between concurrent
 * requests — meaning one user's cached leads could be handed to another. The
 * `isServer` branch is what prevents that.
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        /**
         * Must be above zero with SSR. At 0 the client refetches everything the
         * instant it hydrates, throwing away the server render.
         */
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Retrying a 401/403/404 just repeats the same refusal.
          const status = (error as { status?: number })?.status;
          if (status && status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
