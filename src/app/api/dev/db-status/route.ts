import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const databaseUrl = process.env.DATABASE_URL || '';
  const isPrismaConfigured = !!databaseUrl;
  
  let dbReachable = false;
  let connectionError = null;
  let stats = {
    storesCount: 0,
    productsCount: 0,
    storeProductsCount: 0,
    reviewsCount: 0,
  };

  if (isPrismaConfigured) {
    try {
      // Short timeout check or simple query to verify connection
      await db.$queryRaw`SELECT 1`;
      dbReachable = true;

      // Query database stats
      const [storesCount, productsCount, storeProductsCount, reviewsCount] = await Promise.all([
        db.store.count(),
        db.product.count(),
        db.storeProduct.count(),
        db.review.count(),
      ]);

      stats = {
        storesCount,
        productsCount,
        storeProductsCount,
        reviewsCount,
      };
    } catch (err: any) {
      dbReachable = false;
      connectionError = err.message || String(err);
    }
  }

  return NextResponse.json({
    success: true,
    isPrismaConfigured,
    dbReachable,
    connectionError,
    databaseUrl: databaseUrl ? 'configured' : 'Not Configured',
    stats,
  });
}
