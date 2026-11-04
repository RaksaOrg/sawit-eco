import { apiErrorSchema } from '@sawit/contracts';
import { readSession } from '../auth/session';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    const session = await readSession();
    const token = session?.token;
    const tenantId = session?.tenantId;

    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
        ...options.headers,
      },
    });
    
    console.debug("apiRequest response :>>>", response);

    const payload = (await response.json()) as { success?: boolean; data?: T; error?: unknown };
    if (!response.ok || payload.success === false) {
      const parsed = apiErrorSchema.safeParse(payload);
      throw new Error(parsed.success ? parsed.data.error.message : 'API request failed');
    }
    return (payload.data !== undefined ? payload.data : payload) as T;
  } catch (error) {
    console.error("apiRequest error :>>>", error);
    throw error;
  }
}
