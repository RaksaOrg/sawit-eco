const cartFindUnique = jest.fn();
const cartUpdate = jest.fn();
const orderCreate = jest.fn();
const orderFindUnique = jest.fn();
const orderUpdate = jest.fn();
const taskCreate = jest.fn();
const ledgerCreate = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    cart: {
      findUnique: (...args: unknown[]) => cartFindUnique(...args),
      update: (...args: unknown[]) => cartUpdate(...args),
    },
    order: {
      create: (...args: unknown[]) => orderCreate(...args),
      findUnique: (...args: unknown[]) => orderFindUnique(...args),
      update: (...args: unknown[]) => orderUpdate(...args),
    },
    fieldTask: { create: (...args: unknown[]) => taskCreate(...args) },
    recommendationLedger: { create: (...args: unknown[]) => ledgerCreate(...args) },
  },
}));

import {
  submitOrderFromCart,
  decideOrder,
  recordPaymentProof,
  CommerceError,
} from './approval-service';

const product = {
  id: 'p1',
  nama: 'Pupuk MOP',
  harga: 100000,
  satuanKemasan: 'Sak',
};

function cartItem(recommendationId: string | null = 'log1') {
  return {
    productId: 'p1',
    kuantitas: 2,
    blokKode: 'B2',
    recommendationId,
    alasanRekomendasi: 'Defisiensi K',
    product,
  };
}

describe('commerce approval service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cartUpdate.mockResolvedValue({});
    orderCreate.mockResolvedValue({ id: 'o1', totalHarga: 200000 });
    taskCreate.mockResolvedValue({ id: 't1' });
    ledgerCreate.mockResolvedValue({});
    orderUpdate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 'o1', ...data }),
    );
  });

  it('rejects checkout without estimate acknowledgement', async () => {
    await expect(
      submitOrderFromCart({
        tenantId: 't1',
        userId: 'u1',
        cartId: 'c1',
        estimateAcknowledged: false,
      }),
    ).rejects.toThrow(CommerceError);
  });

  it('rejects empty or cross-tenant cart', async () => {
    cartFindUnique.mockResolvedValueOnce(null);
    await expect(
      submitOrderFromCart({
        tenantId: 't1',
        userId: 'u1',
        cartId: 'c1',
        estimateAcknowledged: true,
      }),
    ).rejects.toThrow('Keranjang kosong');

    cartFindUnique.mockResolvedValueOnce({ tenantId: 't2', items: [cartItem()] });
    await expect(
      submitOrderFromCart({
        tenantId: 't1',
        userId: 'u1',
        cartId: 'c1',
        estimateAcknowledged: true,
      }),
    ).rejects.toThrow('Keranjang kosong');
  });

  it('submits order with pending approval and ledger per recommendation', async () => {
    cartFindUnique.mockResolvedValue({
      id: 'c1',
      tenantId: 't1',
      items: [cartItem(), cartItem(null)],
    });
    const res = await submitOrderFromCart({
      tenantId: 't1',
      userId: 'u1',
      cartId: 'c1',
      estimateAcknowledged: true,
    });
    expect(res.id).toBe('o1');
    expect(orderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'SUBMITTED',
          approvalStatus: 'PENDING',
          totalHarga: 400000,
        }),
      }),
    );
    expect(ledgerCreate).toHaveBeenCalledTimes(1);
  });

  it('rejects decision when order missing or already decided', async () => {
    orderFindUnique.mockResolvedValueOnce(null);
    await expect(
      decideOrder({
        tenantId: 't1',
        orderId: 'o1',
        approverId: 'a1',
        approverRole: 'OWNER',
        decision: 'APPROVED',
      }),
    ).rejects.toThrow('Pesanan tidak ditemukan');

    orderFindUnique.mockResolvedValueOnce({
      id: 'o1',
      tenantId: 't1',
      approvalStatus: 'APPROVED',
      totalHarga: 100,
      items: [],
    });
    await expect(
      decideOrder({
        tenantId: 't1',
        orderId: 'o1',
        approverId: 'a1',
        approverRole: 'OWNER',
        decision: 'APPROVED',
      }),
    ).rejects.toThrow('sudah diputuskan');
  });

  it('enforces manager approval limit', async () => {
    orderFindUnique.mockResolvedValue({
      id: 'o1',
      tenantId: 't1',
      approvalStatus: 'PENDING',
      totalHarga: 3_000_000,
      items: [cartItem()],
    });
    await expect(
      decideOrder({
        tenantId: 't1',
        orderId: 'o1',
        approverId: 'm1',
        approverRole: 'MANAGER',
        decision: 'APPROVED',
      }),
    ).rejects.toThrow('Limit persetujuan');
  });

  it('rejects order without reason keeps existing note', async () => {
    orderFindUnique.mockResolvedValue({
      id: 'o1',
      tenantId: 't1',
      approvalStatus: 'PENDING',
      totalHarga: 100000,
      catatan: 'existing',
      items: [],
    });
    await decideOrder({
      tenantId: 't1',
      orderId: 'o1',
      approverId: 'm1',
      approverRole: 'MANAGER',
      decision: 'REJECTED',
    });
    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'REJECTED', catatan: 'existing' }),
      }),
    );
  });

  it('rejects order with reason', async () => {
    orderFindUnique.mockResolvedValue({
      id: 'o1',
      tenantId: 't1',
      approvalStatus: 'PENDING',
      totalHarga: 100000,
      catatan: 'lama',
      items: [],
    });
    await decideOrder({
      tenantId: 't1',
      orderId: 'o1',
      approverId: 'm1',
      approverRole: 'MANAGER',
      decision: 'REJECTED',
      reason: 'harga terlalu tinggi',
    });
    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'REJECTED', catatan: 'harga terlalu tinggi' }),
      }),
    );
  });

  it('approves order, creates dispatch tasks, and logs ledger only for recommendation-linked items', async () => {
    orderFindUnique.mockResolvedValue({
      id: 'o1',
      tenantId: 't1',
      approvalStatus: 'PENDING',
      totalHarga: 100000,
      items: [
        cartItem(),
        {
          productId: 'p2',
          kuantitas: 1,
          blokKode: 'B3',
          recommendationId: null,
          alasanRekomendasi: null,
          product: { id: 'p2', nama: 'APD', harga: 50000, satuanKemasan: '' },
        },
      ],
    });
    const res = await decideOrder({
      tenantId: 't1',
      orderId: 'o1',
      approverId: 'a1',
      approverRole: 'OWNER',
      decision: 'APPROVED',
    });
    expect(res).toMatchObject({ approvalStatus: 'APPROVED', approvedById: 'a1' });
    expect(taskCreate).toHaveBeenCalledTimes(2);
    expect(ledgerCreate).toHaveBeenCalledTimes(1);
  });

  it('rejects payment for missing, unapproved, or mismatched orders', async () => {
    orderFindUnique.mockResolvedValueOnce(null);
    await expect(
      recordPaymentProof({ tenantId: 't1', orderId: 'x', amount: 1, reference: 'r' }),
    ).rejects.toThrow('Pesanan tidak ditemukan');

    orderFindUnique.mockResolvedValueOnce({
      id: 'o1',
      tenantId: 't1',
      approvalStatus: 'PENDING',
      totalHarga: 100,
    });
    await expect(
      recordPaymentProof({ tenantId: 't1', orderId: 'o1', amount: 100, reference: 'r' }),
    ).rejects.toThrow('belum disetujui');

    orderFindUnique.mockResolvedValueOnce({
      id: 'o1',
      tenantId: 't1',
      approvalStatus: 'APPROVED',
      totalHarga: 100,
    });
    await expect(
      recordPaymentProof({ tenantId: 't1', orderId: 'o1', amount: 90, reference: 'r' }),
    ).rejects.toThrow('Nominal pembayaran');
  });

  it('records valid payment proof', async () => {
    orderFindUnique.mockResolvedValue({
      id: 'o1',
      tenantId: 't1',
      approvalStatus: 'APPROVED',
      totalHarga: 100000,
      catatan: null,
    });
    await recordPaymentProof({
      tenantId: 't1',
      orderId: 'o1',
      amount: 100000,
      reference: 'TRX-1',
      proofUrl: 'https://proof/1.jpg',
    });
    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentStatus: 'PAID', status: 'PAID' }),
      }),
    );
  });

  it('records payment without proof URL', async () => {
    orderFindUnique.mockResolvedValue({
      id: 'o1',
      tenantId: 't1',
      approvalStatus: 'APPROVED',
      totalHarga: 100000,
      catatan: 'existing',
    });
    await recordPaymentProof({ tenantId: 't1', orderId: 'o1', amount: 100000, reference: 'TRX-2' });
    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentStatus: 'PAID', catatan: 'existing' }),
      }),
    );
  });
});
