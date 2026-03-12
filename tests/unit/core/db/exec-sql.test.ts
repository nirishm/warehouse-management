import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ rpc: mockRpc }),
}));

import { execSql } from '@/core/db/exec-sql';

describe('execSql', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns data array on success', async () => {
    mockRpc.mockResolvedValue({ data: [{ id: 1 }], error: null });
    const result = await execSql('SELECT 1');
    expect(result).toEqual([{ id: 1 }]);
  });

  it('returns empty array when data is null', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const result = await execSql('SELECT 1');
    expect(result).toEqual([]);
  });

  it('throws when RPC returns an error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'syntax error' } });
    await expect(execSql('BAD SQL')).rejects.toThrow('SQL execution failed: syntax error');
  });

  it('passes query without params when none provided', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await execSql('SELECT 1');
    expect(mockRpc).toHaveBeenCalledWith('exec_sql', { query: 'SELECT 1' });
  });

  it('passes query with params when provided', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await execSql('SELECT $1', ['hello']);
    expect(mockRpc).toHaveBeenCalledWith('exec_sql', { query: 'SELECT $1', params: ['hello'] });
  });

  it('omits params key when params array is empty', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await execSql('SELECT 1', []);
    expect(mockRpc).toHaveBeenCalledWith('exec_sql', { query: 'SELECT 1' });
  });
});
