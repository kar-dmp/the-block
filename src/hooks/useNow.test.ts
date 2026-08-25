import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNow } from './useNow';

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the current time on mount', () => {
    vi.setSystemTime(1000);
    const { result } = renderHook(() => useNow(1000));
    expect(result.current).toBe(1000);
  });

  it('updates after each interval tick', () => {
    vi.setSystemTime(1000);
    const { result } = renderHook(() => useNow(1000));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(2000);
  });

  it('does not update before the interval elapses', () => {
    vi.setSystemTime(1000);
    const { result } = renderHook(() => useNow(1000));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe(1000);
  });

  it('clears the interval on unmount', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const { unmount } = renderHook(() => useNow(1000));
    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });
});
