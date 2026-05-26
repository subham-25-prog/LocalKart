import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

function readString(product: Record<string, unknown>, key: string) {
  const value = product[key];
  return typeof value === 'string' ? value : '';
}

function mapOpenFoodFactsProduct(code: string, product: Record<string, unknown>) {
  return {
    barcode: code,
    name: readString(product, 'product_name'),
    image: readString(product, 'image_front_url'),
    brand: readString(product, 'brands'),
    category: readString(product, 'categories'),
    description: readString(product, 'generic_name'),
    packaging: readString(product, 'packaging'),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code')?.trim();

  if (!code) {
    return NextResponse.json({ error: 'Missing barcode code' }, { status: 400 });
  }

  try {
    const localProduct = await db.product.findUnique({ where: { barcode: code } });
    if (localProduct) {
      return NextResponse.json(localProduct);
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);
      const resp = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`, {
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (resp.ok) {
        const data = await resp.json() as { status?: number; product?: Record<string, unknown> };
        if (data.status === 1) {
          return NextResponse.json(mapOpenFoodFactsProduct(code, data.product ?? {}));
        }
      }
    } catch (apiErr) {
      console.warn('Open Food Facts API error in barcode lookup route', apiErr);
    }

    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  } catch (err) {
    console.error('Barcode lookup error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
