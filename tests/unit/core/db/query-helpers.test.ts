import { describe, it, expect, vi } from 'vitest';
import { applyLocationFilter, applySoftDeleteFilter } from '@/core/db/query-helpers';

describe('applyLocationFilter', () => {
  it('does nothing when locationIds is null', () => {
    const inMock = vi.fn();
    const query = { in: inMock };
    const result = applyLocationFilter(query as any, 'location_id', null);
    expect(inMock).not.toHaveBeenCalled();
    expect(result).toBe(query);
  });

  it('does nothing when locationIds is empty array', () => {
    const inMock = vi.fn();
    const query = { in: inMock };
    const result = applyLocationFilter(query as any, 'location_id', []);
    expect(inMock).not.toHaveBeenCalled();
    expect(result).toBe(query);
  });

  it('adds .in() when locationIds has values', () => {
    const inMock = vi.fn().mockReturnThis();
    const query = { in: inMock };
    applyLocationFilter(query as any, 'location_id', ['loc1', 'loc2']);
    expect(inMock).toHaveBeenCalledWith('location_id', ['loc1', 'loc2']);
  });
});

describe('applySoftDeleteFilter', () => {
  it('adds .is(deleted_at, null)', () => {
    const isMock = vi.fn().mockReturnThis();
    const query = { is: isMock };
    applySoftDeleteFilter(query as any);
    expect(isMock).toHaveBeenCalledWith('deleted_at', null);
  });
});
