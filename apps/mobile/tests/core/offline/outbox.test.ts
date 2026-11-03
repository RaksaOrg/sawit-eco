import {
  enqueueEvent,
  getPendingCount,
  initOutbox,
  listPendingEvents,
  markEventStatus,
  OutboxEvent,
  syncOutboxBatch,
} from '../../../src/core/offline/outbox';

const mockGetAllAsync = jest.fn();
const mockRunAsync = jest.fn();
const mockGetFirstAsync = jest.fn();
const mockExecAsync = jest.fn();

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue({
    execAsync: (...args: unknown[]) => mockExecAsync(...args),
    runAsync: (...args: unknown[]) => mockRunAsync(...args),
    getFirstAsync: (...args: unknown[]) => mockGetFirstAsync(...args),
    getAllAsync: (...args: unknown[]) => mockGetAllAsync(...args),
  }),
}));

const mockApiRequest = jest.fn();
jest.mock('../../../src/core/api/client', () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
}));

describe('mobile offline outbox engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes outbox schema', async () => {
    mockExecAsync.mockResolvedValueOnce(undefined);
    await initOutbox();
    expect(mockExecAsync).toHaveBeenCalledTimes(1);
    expect(mockExecAsync.mock.calls[0][0]).toContain('CREATE TABLE IF NOT EXISTS outbox_events');
  });

  it('enqueues an event with custom id and default generated id', async () => {
    mockRunAsync.mockResolvedValue(undefined);

    const customId = await enqueueEvent('ATTENDANCE', { blokKode: 'A1' }, 'custom-123');
    expect(customId).toBe('custom-123');
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO outbox_events'),
      'custom-123',
      'ATTENDANCE',
      JSON.stringify({ blokKode: 'A1' }),
      expect.any(String),
      'PENDING',
      0,
    );

    const generatedId = await enqueueEvent('TASK_COMPLETE', { taskId: 't-1' });
    expect(generatedId).toMatch(/^evt-/);
  });

  it('counts pending events including zero fallback', async () => {
    mockGetFirstAsync.mockResolvedValueOnce({ total: 5 });
    expect(await getPendingCount()).toBe(5);

    mockGetFirstAsync.mockResolvedValueOnce(null);
    expect(await getPendingCount()).toBe(0);
  });

  it('lists pending events and parses payload JSON', async () => {
    mockGetAllAsync.mockResolvedValueOnce([
      {
        id: 'evt-1',
        type: 'ATTENDANCE',
        payload: JSON.stringify({ block: 'A1' }),
        createdAt: '2026-11-01T00:00:00.000Z',
        status: 'PENDING',
        retryCount: 0,
      },
    ]);

    const list = await listPendingEvents();
    expect(list).toHaveLength(1);
    expect(list[0].payload).toEqual({ block: 'A1' });
  });

  it('marks event status SYNCED and FAILED', async () => {
    mockRunAsync.mockResolvedValue(undefined);

    await markEventStatus('evt-1', 'SYNCED');
    expect(mockRunAsync).toHaveBeenCalledWith(
      "UPDATE outbox_events SET status = 'SYNCED' WHERE id = ?",
      'evt-1',
    );

    await markEventStatus('evt-2', 'FAILED');
    expect(mockRunAsync).toHaveBeenCalledWith(
      "UPDATE outbox_events SET status = 'FAILED', retryCount = retryCount + 1 WHERE id = ?",
      'evt-2',
    );
  });

  it('returns zero counts when listPendingEvents is empty', async () => {
    mockGetAllAsync.mockResolvedValueOnce([]);
    const result = await syncOutboxBatch('device-empty');
    expect(result).toEqual({ processed: 0, synced: 0, failed: 0 });
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it('syncs outbox events and marks status correctly with id normalization fallback', async () => {
    const rawEvents: OutboxEvent[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'ATTENDANCE',
        payload: { blockCode: 'B2' },
        createdAt: '2026-10-31T10:00:00.000Z',
        status: 'PENDING',
        retryCount: 0,
      },
      {
        id: 'short-id',
        type: 'TASK_COMPLETE',
        payload: { taskId: 't-2' },
        createdAt: '2026-10-31T10:05:00.000Z',
        status: 'PENDING',
        retryCount: 0,
      },
    ];

    mockGetAllAsync.mockResolvedValueOnce(
      rawEvents.map((e) => ({
        ...e,
        payload: JSON.stringify(e.payload),
      })),
    );

    mockApiRequest.mockResolvedValueOnce({
      processed: 2,
      results: [
        { id: rawEvents[0].id, status: 'SYNCED' },
        { id: '123e4567-e89b-12d3-a456-shortid00000', status: 'FAILED' },
      ],
    });

    const result = await syncOutboxBatch();
    expect(result.processed).toBe(2);
    expect(result.synced).toBe(1);
    expect(result.failed).toBe(1);
  });

  it('handles offline network failures by updating retry count for all events', async () => {
    mockGetAllAsync.mockResolvedValueOnce([
      {
        id: 'evt-failed',
        type: 'TASK_COMPLETE',
        payload: JSON.stringify({ taskId: 't-1' }),
        createdAt: '2026-10-31T10:00:00.000Z',
        status: 'PENDING',
        retryCount: 0,
      },
    ]);

    mockApiRequest.mockRejectedValueOnce(new Error('Network unavailable'));

    const result = await syncOutboxBatch('device-test-2');
    expect(result.processed).toBe(1);
    expect(result.synced).toBe(0);
    expect(result.failed).toBe(1);
    expect(mockRunAsync).toHaveBeenCalledWith(
      "UPDATE outbox_events SET status = 'FAILED', retryCount = retryCount + 1 WHERE id = ?",
      'evt-failed',
    );
  });
});
