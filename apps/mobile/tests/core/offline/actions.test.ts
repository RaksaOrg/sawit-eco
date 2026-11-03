import NetInfo from '@react-native-community/netinfo';
import {
  flushOutbox,
  queueAttendance,
  queueDiagnosisMedia,
  queueLearningProgress,
  queueTaskComplete,
  queueThenTrySync,
} from '../../../src/core/offline/actions';
import * as outbox from '../../../src/core/offline/outbox';
import { useMobileAppStore } from '../../../src/state/store';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
}));

jest.mock('../../../src/core/offline/outbox', () => ({
  enqueueEvent: jest.fn(),
  getPendingCount: jest.fn(),
  syncOutboxBatch: jest.fn(),
}));

const mockNetInfoFetch = NetInfo.fetch as jest.MockedFunction<typeof NetInfo.fetch>;
const mockEnqueue = outbox.enqueueEvent as jest.MockedFunction<typeof outbox.enqueueEvent>;
const mockGetPending = outbox.getPendingCount as jest.MockedFunction<
  typeof outbox.getPendingCount
>;
const mockSyncBatch = outbox.syncOutboxBatch as jest.MockedFunction<
  typeof outbox.syncOutboxBatch
>;

describe('offline actions business logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('queues attendance with and without idempotencyKey', async () => {
    mockEnqueue.mockResolvedValueOnce('id-1');
    await queueAttendance({ idempotencyKey: 'idem-1', blokKode: 'A1' });
    expect(mockEnqueue).toHaveBeenCalledWith(
      'ATTENDANCE',
      { idempotencyKey: 'idem-1', blokKode: 'A1' },
      'idem-1',
    );

    await queueAttendance({ blokKode: 'A2' });
    expect(mockEnqueue).toHaveBeenCalledWith(
      'ATTENDANCE',
      { blokKode: 'A2' },
      undefined,
    );
  });

  it('queues task complete, learning progress, and diagnosis media', async () => {
    mockEnqueue.mockResolvedValue('ok');

    await queueTaskComplete({ taskId: 't-1' });
    expect(mockEnqueue).toHaveBeenCalledWith('TASK_COMPLETE', { taskId: 't-1' });

    await queueLearningProgress({ moduleId: 'm-1' });
    expect(mockEnqueue).toHaveBeenCalledWith('LEARNING_PROGRESS', { moduleId: 'm-1' });

    await queueDiagnosisMedia({ photoUri: 'uri' });
    expect(mockEnqueue).toHaveBeenCalledWith('DIAGNOSIS_MEDIA', { photoUri: 'uri' });
  });

  it('flushes outbox, updates store pending count and syncing flag', async () => {
    mockSyncBatch.mockResolvedValueOnce({ processed: 2, synced: 2, failed: 0 });
    mockGetPending.mockResolvedValueOnce(0);

    const result = await flushOutbox();
    expect(result).toEqual({ processed: 2, synced: 2, failed: 0, pending: 0 });
    expect(useMobileAppStore.getState().pendingSyncCount).toBe(0);
    expect(useMobileAppStore.getState().isSyncing).toBe(false);
  });

  it('queueThenTrySync handles offline mode without flushing', async () => {
    mockGetPending.mockResolvedValueOnce(3);
    mockNetInfoFetch.mockResolvedValueOnce({ isConnected: false } as never);

    const queueFn = jest.fn().mockResolvedValue('evt-1');
    const result = await queueThenTrySync(queueFn);

    expect(queueFn).toHaveBeenCalled();
    expect(result).toEqual({ queued: true, syncedOk: false });
    expect(mockSyncBatch).not.toHaveBeenCalled();
    expect(useMobileAppStore.getState().pendingSyncCount).toBe(3);
  });

  it('queueThenTrySync flushes when online and reflects success/failure', async () => {
    mockGetPending.mockResolvedValue(0);
    mockNetInfoFetch.mockResolvedValue({ isConnected: true } as never);

    mockSyncBatch.mockResolvedValueOnce({ processed: 1, synced: 1, failed: 0 });
    const successResult = await queueThenTrySync(async () => 'ok');
    expect(successResult).toEqual({ queued: true, syncedOk: true });

    mockSyncBatch.mockResolvedValueOnce({ processed: 1, synced: 0, failed: 1 });
    const failResult = await queueThenTrySync(async () => 'ok');
    expect(failResult).toEqual({ queued: true, syncedOk: false });
  });
});
