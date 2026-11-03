import NetInfo from '@react-native-community/netinfo';
import { enqueueEvent, getPendingCount, syncOutboxBatch } from './outbox';
import { useMobileAppStore } from '../../state/store';

export async function queueAttendance(payload: Record<string, unknown>) {
  const idempotencyKey = String(payload.idempotencyKey || '');
  return enqueueEvent('ATTENDANCE', payload, idempotencyKey || undefined);
}

export async function queueTaskComplete(payload: Record<string, unknown>) {
  return enqueueEvent('TASK_COMPLETE', payload);
}

export async function queueLearningProgress(payload: Record<string, unknown>) {
  return enqueueEvent('LEARNING_PROGRESS', payload);
}

export async function queueDiagnosisMedia(payload: Record<string, unknown>) {
  return enqueueEvent('DIAGNOSIS_MEDIA', payload);
}

export async function flushOutbox(): Promise<{
  synced: number;
  failed: number;
  pending: number;
}> {
  const store = useMobileAppStore.getState();
  store.setIsSyncing(true);
  try {
    const result = await syncOutboxBatch();
    const pending = await getPendingCount();
    store.setPendingSyncCount(pending);
    return { ...result, pending };
  } finally {
    store.setIsSyncing(false);
  }
}

export async function queueThenTrySync(
  queue: () => Promise<string>,
): Promise<{ queued: boolean; syncedOk: boolean }> {
  await queue();
  const pending = await getPendingCount();
  useMobileAppStore.getState().setPendingSyncCount(pending);

  const state = await NetInfo.fetch();
  if (!state.isConnected) return { queued: true, syncedOk: false };

  const result = await flushOutbox();
  return { queued: true, syncedOk: result.failed === 0 };
}
