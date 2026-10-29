import { useCallback, useEffect, useRef, useState } from 'react';

// Near-real-time updates via polling (works on serverless hosting, unlike WebSockets).
// Pauses while the tab is hidden and refreshes immediately when it becomes visible.
export function usePolling(fetcher, intervalMs, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true, updatedAt: null });
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;

  const load = useCallback(async () => {
    try {
      const data = await fetchRef.current();
      setState({ data, error: null, loading: false, updatedAt: new Date() });
    } catch (e) {
      setState((s) => ({ ...s, error: e.message, loading: false }));
    }
  }, []);

  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
    load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, intervalMs);
    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, intervalMs, load]);

  return { ...state, refresh: load };
}
