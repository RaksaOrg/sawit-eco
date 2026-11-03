import * as SQLite from 'expo-sqlite';
import { SyncBatchInput, SyncResult } from '@sawit/contracts';
import { apiRequest } from '../api/client';

export type OutboxType = 'ATTENDANCE' | 'TASK_COMPLETE' | 'LEARNING_PROGRESS' | 'DIAGNOSIS_MEDIA';

export interface OutboxEvent {
  id: string;
  type: OutboxType;
  payload: Record<string, unknown>;
  createdAt: string;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  retryCount: number;
}

const dbPromise = SQLite.openDatabaseAsync('sawit-offline.db');

export async function initOutbox() {
  const db = await dbPromise;
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS outbox_events (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      retryCount INTEGER NOT NULL DEFAULT 0
    );
  `);
}

export async function enqueueEvent(
  type: OutboxType,
  payload: Record<string, unknown>,
  customId?: string,
): Promise<string> {
  const db = await dbPromise;
  const id = customId || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const createdAt = new Date().toISOString();
  await db.runAsync(
    'INSERT OR REPLACE INTO outbox_events (id, type, payload, createdAt, status, retryCount) VALUES (?, ?, ?, ?, ?, ?)',
    id,
    type,
    JSON.stringify(payload),
    createdAt,
    'PENDING',
    0,
  );
  return id;
}

export async function getPendingCount(): Promise<number> {
  const db = await dbPromise;
  const row = await db.getFirstAsync<{ total: number }>(
    "SELECT COUNT(*) as total FROM outbox_events WHERE status = 'PENDING'",
  );
  return row?.total ?? 0;
}

export async function listPendingEvents(): Promise<OutboxEvent[]> {
  const db = await dbPromise;
  const rows = await db.getAllAsync<{
    id: string;
    type: OutboxType;
    payload: string;
    createdAt: string;
    status: 'PENDING' | 'SYNCED' | 'FAILED';
    retryCount: number;
  }>("SELECT * FROM outbox_events WHERE status = 'PENDING' ORDER BY createdAt ASC LIMIT 50");
  return rows.map((r) => ({
    ...r,
    payload: JSON.parse(r.payload),
  }));
}

export async function markEventStatus(id: string, status: 'SYNCED' | 'FAILED'): Promise<void> {
  const db = await dbPromise;
  if (status === 'SYNCED') {
    await db.runAsync("UPDATE outbox_events SET status = 'SYNCED' WHERE id = ?", id);
  } else {
    await db.runAsync(
      "UPDATE outbox_events SET status = 'FAILED', retryCount = retryCount + 1 WHERE id = ?",
      id,
    );
  }
}

export async function syncOutboxBatch(deviceId = 'mobile-device'): Promise<{
  processed: number;
  synced: number;
  failed: number;
}> {
  const events = await listPendingEvents();
  if (events.length === 0) return { processed: 0, synced: 0, failed: 0 };

  const batchPayload: SyncBatchInput = {
    deviceId,
    events: events.map((e) => {
      const isUuid =/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(e.id);
      const cleanHex = e.id.replace(/[^a-f0-9]/gi, '').padEnd(32, '0').slice(0, 32);
      const uuidFromHex = `${cleanHex.slice(0, 8)}-${cleanHex.slice(8, 12)}-4${cleanHex.slice(13, 16)}-a${cleanHex.slice(17, 20)}-${cleanHex.slice(20, 32)}`;
      return {
        id: isUuid ? e.id : uuidFromHex,
        type: e.type,
        payload: e.payload,
        createdAt: e.createdAt,
        status: 'PENDING',
      };
    }),
  };

  try {
    const response = await apiRequest<{ processed: number; results: SyncResult[] }>(
      '/api/sync/batch',
      {
        method: 'POST',
        body: JSON.stringify(batchPayload),
      },
    );

    let synced = 0;
    let failed = 0;
    const resultMap = new Map<string, 'SYNCED' | 'FAILED'>(
      response.results.map((r) => [r.id, r.status]),
    );

    for (let i = 0; i < events.length; i++) {
      const original = events[i];
      const normalizedId = batchPayload.events[i].id;
      const status = resultMap.get(normalizedId) || 'FAILED';
      await markEventStatus(original.id, status);
      if (status === 'SYNCED') synced++;
      else failed++;
    }

    return { processed: events.length, synced, failed };
  } catch {
    for (const e of events) {
      await markEventStatus(e.id, 'FAILED');
    }
    return { processed: events.length, synced: 0, failed: events.length };
  }
}
