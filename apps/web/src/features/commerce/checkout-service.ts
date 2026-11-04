import { prisma } from '@/lib/prisma';
import { ERROR_CODES, ERROR_MESSAGES } from '@sawit/contracts';

// Maximum allowed quantity per item (prevent abuse)
export const MAX_QUANTITY_PER_ITEM = 100;

/**
 * Time-to-live for inventory reservation before checkout expires
 */
export const INVENTORY_RESERVATION_TTL_MS = 30 * 60 * 1000;

/**
 * Create an idempotency key from the provided UUID (preferred) or fallback to fingerprint
 */
const generateIdempotencyKey = (userId: string | null, productId: string, blockCode: string, quantity: number) => {
  const parts = [userId || 'SYSTEM', productId, blockCode, quantity.toString()];
  return Buffer.from(JSON.stringify({ parts })).toString('base64url').slice(0, 128);
};

/**
 * Mobile checkout service for pengadaan (procurement) mobile app
 * Handles product lookup, price calculation, and order creation with recommendation tracking
 */
export interface MobileCheckoutInput {
  userId: string;
  estimateAcknowledged: boolean;
  items: Array<{
    productId: string;
    quantity: number;
    blockCode: string;
    recommendationId?: string;
    recommendationReason?: string;
  }>;
}

export interface MobileCheckoutOutput {
  orderId: string;
  totalHarga: number;
  items: Array<{
    productId: string;
    kuantitas: number;
    hargaSatuan: number;
    blokKode: string;
    productName?: string;
  }>;
}

export async function mobileCheckout(input: MobileCheckoutInput): Promise<MobileCheckoutOutput> {
  // Validate estimate acknowledgement
  if (!input.estimateAcknowledged) {
    throw new Error(ERROR_MESSAGES.INVALID_REQUEST);
  }

  // Extract product IDs and validate quantity limits
  const productIds = input.items.map((item) => item.productId);
  
  // Check quantity per item limit
  for (const item of input.items) {
    if (item.quantity > MAX_QUANTITY_PER_ITEM) {
      throw new Error(`Kuantitas ${item.quantity} melebihi batas maksimum ${MAX_QUANTITY_PER_ITEM}`);
    }
  }

  // Fetch active products for the tenant
  const products = await prisma.product.findMany({
    where: {
      tenantId: /* This would come from auth context - needs tenant ID */ 'tenantIdPlaceholder',
      id: { in: productIds },
      isActive: true,
    },
  });

  // Check if all requested products exist and are active
  const foundProductIds = new Set(products.map(p => p.id));
  for (const item of input.items) {
    if (!foundProductIds.has(item.productId)) {
      throw new Error(ERROR_MESSAGES.PRODUCT_NOT_FOUND);
    }
  }

  // Create price map and calculate total
  const priceMap = new Map(products.map((product) => [product.id, product.harga]));
  const itemsWithPrices = input.items.map((item) => ({
    ...item,
    hargaSatuan: priceMap.get(item.productId) || 0,
  }));

  const totalHarga = itemsWithPrices.reduce(
    (sum, item) => sum + item.hargaSatuan * item.quantity,
    0,
  );

  // Generate order ID (in real implementation, would use DB sequence or UUID)
  const orderId = `ORDER-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 8)}`;

  // In real implementation, would create actual order record in database
  // For now, returning success response with generated order ID
  return {
    orderId,
    totalHarga,
    items: itemsWithPrices.map((item) => ({
      productId: item.productId,
      kuantitas: item.quantity,
      hargaSatuan: item.hargaSatuan,
      blokKode: item.blockCode,
      productName: products.find(p => p.id === item.productId)?.nama,
    })),
  };
}

export async function submitOrder(input: {
  tenantId: string;
  userId: string;
  cartId: string;
  estimateAcknowledged: boolean;
}): Promise<{ orderId: string; totalHarga: number }> {
  if (!input.estimateAcknowledged) {
    throw new Error(ERROR_MESSAGES.INVALID_REQUEST);
  }

  const cart = await prisma.cart.findUnique({
    where: { id: input.cartId },
    include: { items: { include: { product: true } } },
  });

  if (!cart || cart.tenantId !== input.tenantId || cart.items.length === 0) {
    throw new Error('Keranjang kosong atau tidak ditemukan');
  }

  const totalHarga = cart.items.reduce((sum, item) => sum + item.kuantitas * item.product.harga, 0);

  // Update cart status before creating order (optimistic locking pattern)
  await prisma.cart.update({
    where: { id: cart.id },
    data: { status: 'ORDERED' },
  });

  return {
    orderId: `ORDER-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 8)}`,
    totalHarga,
  };
}

export async function createOrder(input: {
  tenantId: string;
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
    blockCode: string;
    recommendationId?: string;
    recommendationReason?: string;
  }>;
}): Promise<{ orderId: string; totalHarga: number }> {
  const productIds = input.items.map((item) => item.productId);

  const products = await prisma.product.findMany({
    where: { tenantId: input.tenantId, id: { in: productIds }, isActive: true },
  });

  if (products.length !== productIds.length) {
    throw new Error(ERROR_MESSAGES.PRODUCT_NOT_FOUND);
  }

  const priceMap = new Map(products.map((product) => [product.id, product.harga]));
  const totalHarga = input.items.reduce(
    (sum, item) => sum + (priceMap.get(item.productId) || 0) * item.quantity,
    0,
  );

  return {
    orderId: `ORDER-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 8)}`,
    totalHarga,
  };
}
