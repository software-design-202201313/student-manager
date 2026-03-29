import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../api/client', async () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  };
});

import apiClient from '../../api/client';
import { deleteCounseling, updateCounseling, createCounseling, listCounselings } from '../../api/counselings';

describe('api/counselings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls correct path for list', async () => {
    (apiClient.get as any).mockResolvedValueOnce({ data: [] });
    const res = await listCounselings();
    expect(apiClient.get).toHaveBeenCalledWith('/counselings', { params: {} });
    expect(res).toEqual([]);
  });

  it('calls correct path for delete', async () => {
    (apiClient.delete as any).mockResolvedValueOnce({ status: 204 });
    await deleteCounseling('1234-uuid');
    expect(apiClient.delete).toHaveBeenCalledWith('/counselings/1234-uuid');
  });
});

