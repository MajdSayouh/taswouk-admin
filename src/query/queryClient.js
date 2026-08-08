import { QueryClient } from '@tanstack/react-query'

/** Default TanStack Query client — one instance per browser session. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: import.meta.env.PROD,
    },
    mutations: {
      retry: 0,
    },
  },
})
