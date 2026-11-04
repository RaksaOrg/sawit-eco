const blockFindUnique = jest.fn();
const productFindMany = jest.fn();
const agronomyLogCreate = jest.fn();
const agronomyLogFindFirst = jest.fn();
const productGapCreate = jest.fn();
const ledgerCreate = jest.fn();
const cartFindFirst = jest.fn();
const cartCreate = jest.fn();
const cartItemCreate = jest.fn();
const cartFindUnique = jest.fn();
const cartUpdate = jest.fn();
const orderCreate = jest.fn();
const fieldTaskCreate = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    block: { findUnique: (...a: unknown[]) => blockFindUnique(...a) },
    product: { findMany: (...a: unknown[]) => productFindMany(...a) },
    agronomyLog: {
      create: (...a: unknown[]) => agronomyLogCreate(...a),
      findFirst: (...a: unknown[]) => agronomyLogFindFirst(...a),
    },
    productGap: { create: (...a: unknown[]) => productGapCreate(...a) },
    recommendationLedger: { create: (...a: unknown[]) => ledgerCreate(...a) },
    cart: {
      findFirst: (...a: unknown[]) => cartFindFirst(...a),
      create: (...a: unknown[]) => cartCreate(...a),
      findUnique: (...a: unknown[]) => cartFindUnique(...a),
      update: (...a: unknown[]) => cartUpdate(...a),
    },
    cartItem: { create: (...a: unknown[]) => cartItemCreate(...a) },
    order: { create: (...a: unknown[]) => orderCreate(...a) },
    fieldTask: { create: (...a: unknown[]) => fieldTaskCreate(...a) },
  },
}));

import {
  processDiagnosisFlow,
  addToCartFromRecommendation,
  checkoutAndApproveOrder,
} from './closed-loop-service';
import { MANDATORY_AGRONOMY_DISCLAIMER } from '@/src/core/compliance/agronomy-guard';

const product = {
  id: 'p1',
  sku: 'FERT-MOP-50',
  nama: 'Pupuk MOP',
  harga: 400000,
  satuan: 'sak',
  ukuranKemasan: 50,
  satuanKemasan: 'Kg',
  isActive: true,
};

describe('closed loop service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    agronomyLogCreate.mockResolvedValue({ id: 'log1' });
    agronomyLogFindFirst.mockResolvedValue({ id: 'log1' });
    ledgerCreate.mockResolvedValue({});
    productGapCreate.mockResolvedValue({ id: 'gap1' });
  });

  it('RECOMMENDED: block found, ledger stage RECOMMENDED', async () => {
    blockFindUnique.mockResolvedValue({ luasHa: 25 });
    productFindMany.mockResolvedValue([product]);
    const res = await processDiagnosisFlow({
      tenantId: 't1',
      userId: 'u1',
      blockCode: 'B2',
      symptoms: 'daun oranye',
      targetSku: 'FERT-MOP-50',
      dosageKgPerHa: 150,
      disclaimer: MANDATORY_AGRONOMY_DISCLAIMER,
      reason: 'Defisiensi K',
    });
    expect(res.logId).toBe('log1');
    expect(res.recommendation.status).toBe('RECOMMENDED');
    expect(res.recommendation.estimation?.jumlahSak).toBe(75);
    expect(res.recommendation.card?.sku).toBe('FERT-MOP-50');
    expect(res.recommendation.card?.kuantitas).toBe(75);
    expect(res.gapId).toBeUndefined();
    expect(productGapCreate).not.toHaveBeenCalled();
    expect(ledgerCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ stage: 'RECOMMENDED' }),
      }),
    );
  });

  it('PRODUCT_GAP: block null fallback 1 Ha, gap created', async () => {
    blockFindUnique.mockResolvedValue(null);
    productFindMany.mockResolvedValue([]);
    const res = await processDiagnosisFlow({
      tenantId: 't1',
      userId: 'u1',
      blockCode: 'B9',
      symptoms: 'bercak',
      photoUrl: 'https://x/y.jpg',
      targetSku: 'UNKNOWN-SKU',
      dosageKgPerHa: 100,
      disclaimer: MANDATORY_AGRONOMY_DISCLAIMER,
      reason: 'Butuh produk X',
    });
    expect(res.recommendation.status).toBe('PRODUCT_GAP');
    expect(res.gapId).toBe('gap1');
    expect(productGapCreate).toHaveBeenCalled();
  });

  it('reject missing disclaimer before DB write', async () => {
    blockFindUnique.mockResolvedValue({ luasHa: 25 });
    productFindMany.mockResolvedValue([product]);
    await expect(
      processDiagnosisFlow({
        tenantId: 't1',
        userId: 'u1',
        blockCode: 'B2',
        symptoms: 'g',
        targetSku: 'FERT-MOP-50',
        dosageKgPerHa: 150,
        disclaimer: 'tidak valid',
        reason: 'a',
      }),
    ).rejects.toThrow('wajib menyertakan disclaimer');
    expect(agronomyLogCreate).not.toHaveBeenCalled();
  });

  it('addToCart: existing cart reused', async () => {
    cartFindFirst.mockResolvedValue({ id: 'c1' });
    cartItemCreate.mockResolvedValue({ id: 'ci1' });
    const res = await addToCartFromRecommendation({
      tenantId: 't1',
      userId: 'u1',
      productId: 'p1',
      quantity: 75,
      blockCode: 'B2',
      recommendationId: 'log1',
      recommendationReason: 'Defisiensi K',
    });
    expect(res.cart.id).toBe('c1');
    expect(cartCreate).not.toHaveBeenCalled();
    expect(res.item.id).toBe('ci1');
  });

  it('addToCart: new cart created when none active', async () => {
    cartFindFirst.mockResolvedValue(null);
    cartCreate.mockResolvedValue({ id: 'c2' });
    cartItemCreate.mockResolvedValue({ id: 'ci2' });
    const res = await addToCartFromRecommendation({
      tenantId: 't1',
      userId: 'u1',
      productId: 'p1',
      quantity: 1,
      blockCode: 'B2',
      recommendationId: 'log1',
      recommendationReason: 'a',
    });
    expect(cartCreate).toHaveBeenCalled();
    expect(res.cart.id).toBe('c2');
  });

  it('checkout: empty / missing cart throws', async () => {
    cartFindUnique.mockResolvedValue(null);
    await expect(
      checkoutAndApproveOrder({ tenantId: 't1', userId: 'u1', cartId: 'x' }),
    ).rejects.toThrow('Keranjang kosong');
    cartFindUnique.mockResolvedValue({ id: 'c1', items: [] });
    await expect(
      checkoutAndApproveOrder({ tenantId: 't1', userId: 'u1', cartId: 'c1' }),
    ).rejects.toThrow('Keranjang kosong');
  });

  it('checkout: order approved, cart ordered, task per item, ledger per recommendationId', async () => {
    const itemWithRec = {
      productId: 'p1',
      kuantitas: 75,
      blokKode: 'B2',
      recommendationId: 'log1',
      alasanRekomendasi: 'Defisiensi K',
      product,
    };
    const itemNoRec = {
      productId: 'p2',
      kuantitas: 2,
      blokKode: 'B3',
      recommendationId: null,
      recommendationReason: null,
      product: { ...product, id: 'p2', harga: 10000, nama: 'APD', satuanKemasan: '' },
    };
    cartFindUnique.mockResolvedValue({ id: 'c1', items: [itemWithRec, itemNoRec] });
    orderCreate.mockResolvedValue({ id: 'o1', status: 'APPROVED' });
    cartUpdate.mockResolvedValue({});
    fieldTaskCreate.mockResolvedValueOnce({ id: 'task1' }).mockResolvedValueOnce({ id: 'task2' });
    const res = await checkoutAndApproveOrder({
      tenantId: 't1',
      userId: 'u1',
      cartId: 'c1',
      approverMandorId: 'm1',
    });
    expect(res.order.id).toBe('o1');
    expect(res.tasks).toHaveLength(2);
    expect(orderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ totalHarga: 75 * 400000 + 2 * 10000 }),
      }),
    );
    // deskripsi fallback branch (alasan null) + satuanTarget fallback branch
    expect(fieldTaskCreate).toHaveBeenCalledTimes(2);
    expect(ledgerCreate).toHaveBeenCalledTimes(1);
  });
});
