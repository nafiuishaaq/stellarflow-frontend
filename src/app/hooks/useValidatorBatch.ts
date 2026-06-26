import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { getCacheOptions } from '@/config/cacheConfig';

/**
 * Type representing the validator metric payload returned by the backend.
 * Adjust fields to match the actual API response shape.
 */
export interface ValidatorMetric {
  address: string;
  // Example fields – extend as needed
  price: number;
  confidenceScore: number;
  source: string;
  timestamp: number;
}

/**
 * React Query hook that batches validator address lookups into a single network request.
 * Implements minimum 10-second cache intervals to prevent backend flooding.
 *
 * @param addresses - Array of validator account addresses to fetch.
 * @returns Query result containing an array of {@link ValidatorMetric} objects.
 */
export function useValidatorBatch(
  addresses: string[],
): UseQueryResult<ValidatorMetric[], Error> {
  // Stable query key – addresses array is stringified to ensure proper caching.
  const queryKey = ['validators', addresses.sort().join(',')];

  // Use SHORT_INTERVAL (10s) to prevent excessive validator metric lookups
  // while keeping data reasonably fresh for status monitoring.
  const cacheConfig = getCacheOptions('SHORT_INTERVAL');

  return useQuery<ValidatorMetric[], Error>({
    queryKey,
    queryFn: async () => {
      if (addresses.length === 0) return [];
      const url = `/api/validators?ids=${addresses.map(encodeURIComponent).join(',')}`;
      const res = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch validator metrics: ${res.status}`);
      }
      const data: ValidatorMetric[] = await res.json();
      return data;
    },
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
    staleTime: cacheConfig.staleTime,
    gcTime: cacheConfig.gcTime,
  });
}
