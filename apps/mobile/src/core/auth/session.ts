import * as SecureStore from 'expo-secure-store';

export type UserRole = 'OWNER' | 'MANAGER' | 'AGRONOM' | 'ADMIN_COMMERCE' | 'MANDOR' | 'PEKERJA';

export interface MobileSession {
  token: string;
  userId: string;
  userName: string;
  tenantId: string;
  tenantName: string;
  role: UserRole;
  phone: string;
}

const SESSION_KEY = 'sawit_mobile_session';

export async function saveSession(session: MobileSession): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function readSession(): Promise<MobileSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MobileSession;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    // Ignore clear errors on missing key
  }
}
