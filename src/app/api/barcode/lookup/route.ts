import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fetchOpenFoodFactsProduct, mapOpenFoodFactsProduct } from '@/lib/openFoodFacts';

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

    const offProduct = await fetchOpenFoodFactsProduct(code);
    if (offProduct) {
      return NextResponse.json(mapOpenFoodFactsProduct(code, offProduct));
    }

    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  } catch (err) {
    console.error('Barcode lookup error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
