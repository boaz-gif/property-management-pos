import { QueryClient } from '@tanstack/react-query';

// Create a query client with optimized configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Time in milliseconds that data remains fresh
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Time in milliseconds that inactive queries will remain in cache
      cacheTime: 10 * 60 * 1000, // 10 minutes
      // Number of times to retry failed requests
      retry: 3,
      // Delay between retries in ms
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Whether to refetch on window focus
      refetchOnWindowFocus: false,
      // Whether to refetch on reconnect
      refetchOnReconnect: true,
      // Whether to refetch on mount if data is stale
      refetchOnMount: true,
      // Default error handling
      onError: (error) => {
        console.error('Query error:', error);
      },
    },
    mutations: {
      // Number of times to retry failed mutations
      retry: 1,
      // Default error handling for mutations
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});

export default queryClient;
