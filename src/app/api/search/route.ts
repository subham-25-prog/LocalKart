import { NextResponse } from 'next/server';
import { searchProducts } from '@/lib/services';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const lat = parseFloat(searchParams.get('lat') || '12.9716');
    const lng = parseFloat(searchParams.get('lng') || '77.6400');
    const dbMode = searchParams.get('db_mode') || 'postgres';

    const products = await searchProducts(q, lat, lng, dbMode);
    return NextResponse.json({ success: true, products });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error in search API:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
