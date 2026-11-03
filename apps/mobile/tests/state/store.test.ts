import {
  clearSession,
  MobileSession,
  readSession,
  saveSession,
} from '../../src/core/auth/session';
import { useMobileAppStore } from '../../src/state/store';

jest.mock('../../src/core/auth/session', () => ({
  saveSession: jest.fn(),
  readSession: jest.fn(),
  clearSession: jest.fn(),
}));

const mockSaveSession = saveSession as jest.MockedFunction<typeof saveSession>;
const mockReadSession = readSession as jest.MockedFunction<typeof readSession>;
const mockClearSession = clearSession as jest.MockedFunction<typeof clearSession>;

const session: MobileSession = {
  token: 'jwt',
  userId: 'u-1',
  userName: 'Mandor',
  tenantId: 't-1',
  tenantName: 'PT Sawit',
  role: 'MANDOR',
  phone: '6281',
};

const resetStore = () =>
  useMobileAppStore.setState({
    session: null,
    isAuthenticated: false,
    isLoadingSession: true,
    language: 'id',
    pendingSyncCount: 0,
    isSyncing: false,
    cart: [],
  });

describe('mobile app store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  it('sets a session and persists it', async () => {
    await useMobileAppStore.getState().setSession(session);
    expect(mockSaveSession).toHaveBeenCalledWith(session);
    expect(useMobileAppStore.getState()).toMatchObject({
      session,
      isAuthenticated: true,
      isLoadingSession: false,
    });
  });

  it('clears session when null is provided', async () => {
    await useMobileAppStore.getState().setSession(null);
    expect(mockClearSession).toHaveBeenCalled();
    expect(useMobileAppStore.getState()).toMatchObject({
      session: null,
      isAuthenticated: false,
      isLoadingSession: false,
    });
  });

  it('loads session successfully', async () => {
    mockReadSession.mockResolvedValueOnce(session);
    await useMobileAppStore.getState().loadSession();
    expect(useMobileAppStore.getState()).toMatchObject({
      session,
      isAuthenticated: true,
      isLoadingSession: false,
    });
  });

  it('falls back when loading session fails', async () => {
    mockReadSession.mockRejectedValueOnce(new Error('boom'));
    await useMobileAppStore.getState().loadSession();
    expect(useMobileAppStore.getState()).toMatchObject({
      session: null,
      isAuthenticated: false,
      isLoadingSession: false,
    });
  });

  it('logs out and clears session', async () => {
    useMobileAppStore.setState({ session, isAuthenticated: true });
    await useMobileAppStore.getState().logout();
    expect(mockClearSession).toHaveBeenCalled();
    expect(useMobileAppStore.getState()).toMatchObject({
      session: null,
      isAuthenticated: false,
    });
  });

  it('updates language and sync state', () => {
    const state = useMobileAppStore.getState();
    state.setLanguage('en');
    state.setPendingSyncCount(4);
    state.setIsSyncing(true);

    expect(useMobileAppStore.getState()).toMatchObject({
      language: 'en',
      pendingSyncCount: 4,
      isSyncing: true,
    });
  });

  it('adds new cart items and merges existing quantities', () => {
    const state = useMobileAppStore.getState();
    state.addToCart({
      productId: 'p2',
      name: 'Herbisida',
      sku: 'SKU-2',
      price: 2000,
      quantity: 1,
      blockCode: 'A2',
    });
    state.addToCart({
      productId: 'p1',
      name: 'Pupuk',
      sku: 'SKU-1',
      price: 1000,
      quantity: 1,
      blockCode: 'A1',
    });
    state.addToCart({
      productId: 'p1',
      name: 'Pupuk',
      sku: 'SKU-1',
      price: 1000,
      quantity: 2,
      blockCode: 'A1',
    });

    const cart = useMobileAppStore.getState().cart;
    expect(cart).toHaveLength(2);
    expect(cart.find((item) => item.productId === 'p1')?.quantity).toBe(3);
  });

  it('updates, removes, and clears cart items', () => {
    useMobileAppStore.setState({
      cart: [
        {
          productId: 'p1',
          name: 'Pupuk',
          sku: 'SKU-1',
          price: 1000,
          quantity: 1,
          blockCode: 'A1',
        },
      ],
    });

    const state = useMobileAppStore.getState();
    state.updateCartQuantity('p1', 5);
    state.updateCartQuantity('missing', 9);
    expect(useMobileAppStore.getState().cart[0].quantity).toBe(5);

    state.removeFromCart('missing');
    expect(useMobileAppStore.getState().cart).toHaveLength(1);
    state.removeFromCart('p1');
    expect(useMobileAppStore.getState().cart).toHaveLength(0);

    state.addToCart({
      productId: 'p2',
      name: 'Herbisida',
      sku: 'SKU-2',
      price: 2000,
      quantity: 1,
      blockCode: 'A2',
    });
    state.clearCart();
    expect(useMobileAppStore.getState().cart).toHaveLength(0);
  });
});
