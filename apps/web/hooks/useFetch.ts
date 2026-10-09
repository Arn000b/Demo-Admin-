'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { PaginatedResponse } from '@repo/type';

interface FetchState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Simple data fetching hook.
 *
 * @example
 * const { data, isLoading, error, refetch } = useFetch<Customer[]>('/api/customers');
 */
export function useFetch<T>(url: string, options?: RequestInit) {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    isLoading: true,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const res = await fetch(url, { signal: abortRef.current.signal, ...options });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const json = (await res.json()) as T;
      setState({ data: json, isLoading: false, error: null });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setState({ data: null, isLoading: false, error: (err as Error).message });
    }
  }, [url]);

  useEffect(() => {
    fetchData();
    return () => abortRef.current?.abort();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}

/**
 * Paginated data fetching hook.
 */
export function usePaginatedFetch<T>(baseUrl: string, initialPage = 1, pageSize = 20) {
  const [page, setPage] = useState(initialPage);
  const url = `${baseUrl}?page=${page}&pageSize=${pageSize}`;
  const result = useFetch<PaginatedResponse<T>>(url);

  return {
    ...result,
    page,
    setPage,
    goToNextPage: () => setPage((p) => p + 1),
    goToPrevPage: () => setPage((p) => Math.max(1, p - 1)),
  };
}
