import { create } from 'zustand';
import { MobileSession, readSession, saveSession, clearSession } from '../core/auth/session';

export interface CartItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  blockCode: string;
  recommendationId?: string;
  reason?: string;
}

interface MobileAppState {
  session: MobileSession | null;
  isAuthenticated: boolean;
  isLoadingSession: boolean;
  language: 'id' | 'en';
  pendingSyncCount: number;
  isSyncing: boolean;
  cart: CartItem[];
  setSession: (session: MobileSession | null) => Promise<void>;
  loadSession: () => Promise<void>;
  logout: () => Promise<void>;
  setLanguage: (lang: 'id' | 'en') => void;
  setPendingSyncCount: (count: number) => void;
  setIsSyncing: (isSyncing: boolean) => void;
  addToCart: (item: CartItem) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
}

export const useMobileAppStore = create<MobileAppState>((set, get) => ({
  session: null,
  isAuthenticated: false,
  isLoadingSession: true,
  language: 'id',
  pendingSyncCount: 0,
  isSyncing: false,
  cart: [],
  setSession: async (session) => {
    if (session) {
      await saveSession(session);
      set({ session, isAuthenticated: true, isLoadingSession: false });
    } else {
      await clearSession();
      set({ session: null, isAuthenticated: false, isLoadingSession: false });
    }
  },
  loadSession: async () => {
    try {
      const session = await readSession();
      set({
        session,
        isAuthenticated: Boolean(session),
        isLoadingSession: false,
      });
    } catch {
      set({ session: null, isAuthenticated: false, isLoadingSession: false });
    }
  },
  logout: async () => {
    await clearSession();
    set({ session: null, isAuthenticated: false });
  },
  setLanguage: (language) => set({ language }),
  setPendingSyncCount: (pendingSyncCount) => set({ pendingSyncCount }),
  setIsSyncing: (isSyncing) => set({ isSyncing }),
  addToCart: (item) =>
    set((state) => {
      const existing = state.cart.find((entry) => entry.productId === item.productId);
      if (existing) {
        return {
          cart: state.cart.map((entry) =>
            entry.productId === item.productId
              ? { ...entry, quantity: entry.quantity + item.quantity }
              : entry,
          ),
        };
      }
      return { cart: [...state.cart, item] };
    }),
  updateCartQuantity: (productId, quantity) =>
    set((state) => ({
      cart: state.cart.map((item) => (item.productId === productId ? { ...item, quantity } : item)),
    })),
  removeFromCart: (productId) =>
    set((state) => ({ cart: state.cart.filter((item) => item.productId !== productId) })),
  clearCart: () => set({ cart: [] }),
}));
