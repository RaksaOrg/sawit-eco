import { OutboxEvent, syncOutboxBatch } from './outbox';

const mockGetAllAsync = jest.fn();
const mockRunAsync = jest.fn();

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue({
    execAsync: jest.fn().mockResolvedValue(undefined),
    runAsync: (...args: unknown[]) => mockRunAsync(...args),
    getFirstAsync: jest.fn().mockResolvedValue({ total: 2 }),
    getAllAsync: (...args: unknown[]) => mockGetAllAsync(...args),
  }),
}));

const mockApiRequest = jest.fn();
jest.mock('../api/client', () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
}));

describe('mobile offline outbox engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('syncs outbox events and marks status correctly', async () => {
    const rawEvents: OutboxEvent[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'ATTENDANCE',
        payload: { blockCode: 'B2' },
        createdAt: '2026-10-31T10:00:00.000Z',
        status: 'PENDING',
        retryCount: 0,
      },
    ];

    mockGetAllAsync.mockResolvedValueOnce([
      {
        id: rawEvents[0].id,
        type: rawEvents[0].type,
        payload: JSON.stringify(rawEvents[0].payload),
        createdAt: rawEvents[0].createdAt,
        status: rawEvents[0].status,
        retryCount: 0,
      },
    ]);

    mockApiRequest.mockResolvedValueOnce({
      processed: 1,
      results: [{ id: rawEvents[0].id, status: 'SYNCED' }],
    });

    const result = await syncOutboxBatch('device-test-1');
    expect(result.processed).toBe(1);
    expect(result.synced).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockRunAsync).toHaveBeenCalledWith(
      "UPDATE outbox_events SET status = 'SYNCED' WHERE id = ?",
      rawEvents[0].id,
    );
  });

  it('handles offline network failures by updating retry count', async () => {
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
