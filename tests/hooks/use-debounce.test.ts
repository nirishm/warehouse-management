import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Test the pure debounce mechanic (mirrors hook logic, no jsdom needed)
function makeDebouncer(delay: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return function debounce(fn: () => void) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fn, delay);
  };
}

describe('debounce mechanic', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('does not call callback immediately', () => {
    const cb = vi.fn();
    const debounce = makeDebouncer(300);
    debounce(cb);
    expect(cb).not.toHaveBeenCalled();
  });

  it('calls callback after delay elapses', () => {
    const cb = vi.fn();
    const debounce = makeDebouncer(300);
    debounce(cb);
    vi.advanceTimersByTime(300);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('resets timer when called again before delay', () => {
    const cb = vi.fn();
    const debounce = makeDebouncer(300);
    debounce(cb);
    vi.advanceTimersByTime(200);
    debounce(cb);
    vi.advanceTimersByTime(200); // 200ms since last call, not 300
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('fires only once for rapid successive calls', () => {
    const cb = vi.fn();
    const debounce = makeDebouncer(300);
    for (let i = 0; i < 10; i++) debounce(cb);
    vi.advanceTimersByTime(300);
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
