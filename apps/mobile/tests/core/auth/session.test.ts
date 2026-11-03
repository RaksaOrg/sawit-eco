import * as SecureStore from 'expo-secure-store';
import {
  clearSession,
  MobileSession,
  readSession,
  saveSession,
} from '../../../src/core/auth/session';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockSetItem = SecureStore.setItemAsync as jest.MockedFunction<
  typeof SecureStore.setItemAsync
>;
const mockGetItem = SecureStore.getItemAsync as jest.MockedFunction<
  typeof SecureStore.getItemAsync
>;
const mockDeleteItem = SecureStore.deleteItemAsync as jest.MockedFunction<
  typeof SecureStore.deleteItemAsync
>;

describe('mobile session management', () => {
  const session: MobileSession = {
    token: 'jwt-123',
    userId: 'u-1',
    userName: 'Budi Mandor',
    tenantId: 't-1',
    tenantName: 'PT Sawit',
    role: 'MANDOR',
    phone: '628123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves session as JSON string', async () => {
    await saveSession(session);
    expect(mockSetItem).toHaveBeenCalledWith(
      'sawit_mobile_session',
      JSON.stringify(session),
    );
  });

  it('reads session when present', async () => {
    mockGetItem.mockResolvedValueOnce(JSON.stringify(session));
    const result = await readSession();
    expect(result).toEqual(session);
  });

  it('returns null when session is not found', async () => {
    mockGetItem.mockResolvedValueOnce(null);
    expect(await readSession()).toBeNull();
  });

  it('returns null and catches invalid JSON', async () => {
    mockGetItem.mockResolvedValueOnce('not-json{');
    expect(await readSession()).toBeNull();
  });

  it('clears session ignoring errors', async () => {
    mockDeleteItem.mockResolvedValueOnce(undefined);
    await clearSession();
    expect(mockDeleteItem).toHaveBeenCalledWith('sawit_mobile_session');

    mockDeleteItem.mockRejectedValueOnce(new Error('Missing key'));
    await expect(clearSession()).resolves.toBeUndefined();
  });
});
