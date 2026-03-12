import { describe, it, expect, vi } from 'vitest';
import { parsePagination, applyPagination, paginatedResult } from '@/lib/pagination';

describe('parsePagination', () => {
  it('returns defaults when no params', () => {
    const url = new URL('http://localhost/api/t/demo/dispatches');
    const result = parsePagination(url.searchParams);
    expect(result).toEqual({ page: 1, pageSize: 50 });
  });

  it('parses page and pageSize', () => {
    const url = new URL('http://localhost/api?page=3&pageSize=20');
    expect(parsePagination(url.searchParams)).toEqual({ page: 3, pageSize: 20 });
  });

  it('caps pageSize at 200', () => {
    const url = new URL('http://localhost/api?pageSize=999');
    expect(parsePagination(url.searchParams)).toEqual({ page: 1, pageSize: 200 });
  });

  it('floors page at 1', () => {
    const url = new URL('http://localhost/api?page=0');
    expect(parsePagination(url.searchParams)).toEqual({ page: 1, pageSize: 50 });
  });

  it('handles non-numeric values', () => {
    const url = new URL('http://localhost/api?page=abc&pageSize=xyz');
    expect(parsePagination(url.searchParams)).toEqual({ page: 1, pageSize: 50 });
  });
});

describe('applyPagination', () => {
  it('adds range for page 1', () => {
    const rangeMock = vi.fn().mockReturnThis();
    const mockQuery = { range: rangeMock };
    applyPagination(mockQuery as any, { page: 1, pageSize: 10 });
    expect(rangeMock).toHaveBeenCalledWith(0, 9);
  });

  it('adds range for page 2', () => {
    const rangeMock = vi.fn().mockReturnThis();
    const mockQuery = { range: rangeMock };
    applyPagination(mockQuery as any, { page: 2, pageSize: 10 });
    expect(rangeMock).toHaveBeenCalledWith(10, 19);
  });
});

describe('paginatedResult', () => {
  it('creates paginated response', () => {
    const result = paginatedResult([{ id: 1 }], 100, { page: 1, pageSize: 50 });
    expect(result).toEqual({
      data: [{ id: 1 }],
      total: 100,
      page: 1,
      pageSize: 50,
    });
  });
});
