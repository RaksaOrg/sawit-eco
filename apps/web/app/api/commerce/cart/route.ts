import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const tenant = await requireTenant(req);
    // Find active cart for this tenant
    const cart = await prisma.cart.findFirst({
      where: { tenantId: tenant.id, status: 'ACTIVE' },
      include: {
        items: {
          include: {
            product: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!cart) {
      return NextResponse.json({
        success: true,
        data: { id: null, items: [], total: 0, count: 0 },
      });
    }

    const total = cart.items.reduce((sum, item) => sum + item.kuantitas * item.product.harga, 0);
    const count = cart.items.reduce((sum, item) => sum + item.kuantitas, 0);

    return NextResponse.json({
      success: true,
      data: {
        id: cart.id,
        items: cart.items.map((it) => ({
          id: it.id,
          productId: it.productId,
          productName: it.product.nama,
          sku: it.product.sku,
          kategori: it.product.kategori,
          harga: it.product.harga,
          satuan: it.product.satuan,
          kuantitas: it.kuantitas,
          subtotal: it.kuantitas * it.product.harga,
          blokKode: it.blokKode,
          recommendationId: it.recommendationId,
          alasanRekomendasi: it.alasanRekomendasi,
        })),
        total,
        count,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat keranjang';
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await requireTenant(req);
    const body = await req.json();

    const { productId, quantity, blockCode, recommendationId, recommendationReason } = body;

    if (!productId || !quantity || quantity <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Produk dan kuantitas valid wajib diisi' },
        },
        { status: 400 },
      );
    }

    // Find default user for this tenant if not specified
    const defaultUser = await prisma.user.findFirst({
      where: { tenantId: tenant.id },
      select: { id: true },
    });

    if (!defaultUser) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_USER', message: 'User tenant belum terdaftar' } },
        { status: 400 },
      );
    }

    let cart = await prisma.cart.findFirst({
      where: { tenantId: tenant.id, status: 'ACTIVE' },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          tenantId: tenant.id,
          userId: defaultUser.id,
          status: 'ACTIVE',
        },
      });
    }

    const item = await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        kuantitas: Number(quantity),
        blokKode: blockCode || 'ALL',
        recommendationId: recommendationId || null,
        alasanRekomendasi: recommendationReason || null,
      },
    });

    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menambahkan ke keranjang';
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const tenant = await requireTenant(req);
    const itemId = req.nextUrl.searchParams.get('itemId');

    if (itemId) {
      await prisma.cartItem.deleteMany({
        where: {
          id: itemId,
          cart: { tenantId: tenant.id },
        },
      });
    } else {
      // Clear all active cart items
      const cart = await prisma.cart.findFirst({
        where: { tenantId: tenant.id, status: 'ACTIVE' },
      });
      if (cart) {
        await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menghapus item keranjang';
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 },
    );
  }
}
