import { useEffect, useState } from 'react';

/**
 * A clock that re-renders on an interval. Lists tick every 15s, the detail
 * page every second — countdowns only need to look alive.
 */
export function useNow(intervalMs = 15000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
