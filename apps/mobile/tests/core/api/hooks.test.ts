import { useQuery } from '@tanstack/react-query';
import {
  useCatalog,
  useLearningModules,
  usePendingOrders,
  useTasks,
} from '../../../src/core/api/hooks';
import { apiRequest } from '../../../src/core/api/client';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn((options) => options),
}));
jest.mock('../../../src/core/api/client', () => ({
  apiRequest: jest.fn(),
}));

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

type QueryOptions = { queryFn: () => Promise<unknown> };

describe('mobile query hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches tasks', async () => {
    mockApiRequest.mockResolvedValueOnce({ tasks: [{ id: 't1' }] });
    const result = (await (useTasks() as unknown as QueryOptions).queryFn()) as unknown[];
    expect(result).toEqual([{ id: 't1' }]);
    expect(mockApiRequest).toHaveBeenCalledWith('/api/tasks?status=ASSIGNED');
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('fetches learning modules', async () => {
    mockApiRequest.mockResolvedValueOnce({ modules: [{ id: 'm1' }] });
    const result = (await (useLearningModules() as unknown as QueryOptions).queryFn()) as unknown[];
    expect(result).toEqual([{ id: 'm1' }]);
    expect(mockApiRequest).toHaveBeenCalledWith('/api/learning/modules');
  });

  it('fetches catalog products', async () => {
    mockApiRequest.mockResolvedValueOnce({ products: [{ id: 'p1' }] });
    const result = (await (useCatalog() as unknown as QueryOptions).queryFn()) as unknown[];
    expect(result).toEqual([{ id: 'p1' }]);
    expect(mockApiRequest).toHaveBeenCalledWith('/api/commerce/catalog');
  });

  it('fetches pending orders', async () => {
    mockApiRequest.mockResolvedValueOnce({ orders: [{ id: 'o1' }] });
    const result = (await (usePendingOrders() as unknown as QueryOptions).queryFn()) as unknown[];
    expect(result).toEqual([{ id: 'o1' }]);
    expect(mockApiRequest).toHaveBeenCalledWith('/api/commerce/orders?status=SUBMITTED');
  });
});
