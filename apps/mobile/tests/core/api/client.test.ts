import { apiRequest } from '../../../src/core/api/client';
import { readSession } from '../../../src/core/auth/session';

jest.mock('../../../src/core/auth/session', () => ({
  readSession: jest.fn(),
}));

const mockReadSession = readSession as jest.MockedFunction<typeof readSession>;
const mockFetch = jest.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

describe('mobile api client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends auth and tenant headers and unwraps data', async () => {
    mockReadSession.mockResolvedValueOnce({
      token: 'token-1',
      tenantId: 'tenant-1',
    } as never);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { value: 42 } }),
    });

    const result = await apiRequest<{ value: number }>('/api/test', {
      method: 'POST',
      headers: { 'x-custom': 'yes' },
    });

    expect(result).toEqual({ value: 42 });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/test'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer token-1',
          'x-tenant-id': 'tenant-1',
          'x-custom': 'yes',
        }),
      }),
    );
  });

  it('omits auth headers without session and returns raw payload', async () => {
    mockReadSession.mockResolvedValueOnce(null);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ raw: true }),
    });

    const result = await apiRequest<{ raw: boolean }>('/api/public');

    expect(result).toEqual({ raw: true });
    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers).not.toHaveProperty('authorization');
    expect(options.headers).not.toHaveProperty('x-tenant-id');
  });

  it('throws parsed API error message', async () => {
    mockReadSession.mockResolvedValueOnce(null);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not allowed' },
      }),
    });

    await expect(apiRequest('/api/secure')).rejects.toThrow('Not allowed');
  });

  it('throws fallback message when error payload is invalid', async () => {
    mockReadSession.mockResolvedValueOnce(null);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false, error: {} }),
    });

    await expect(apiRequest('/api/broken')).rejects.toThrow('API request failed');
  });
});
