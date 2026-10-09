'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Debounce a value by `delay` milliseconds.
 * Useful for search inputs to avoid firing API calls on every keystroke.
 *
 * @example
 * const debouncedQuery = useDebounce(searchQuery, 400);
 * useEffect(() => { fetchResults(debouncedQuery); }, [debouncedQuery]);
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
