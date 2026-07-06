import { NextResponse } from 'next/server';
import { searchProducts } from '@/lib/services';
import { parseGeoParams } from '@/lib/apiHelpers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const { lat, lng, dbMode } = parseGeoParams(searchParams);

    const products = await searchProducts(q, lat, lng, dbMode);
    return NextResponse.json({ success: true, products });
  } catch (error: unknown) {
    console.error('Error in search API:', error);
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    );
  }
}
