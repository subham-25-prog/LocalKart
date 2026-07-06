import { NextResponse } from 'next/server';
import { db, isDbConnected } from '@/lib/db';

import { resolveSellerId } from '@/lib/seller';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!(await isDbConnected())) {
      return NextResponse.json({ success: false, error: 'PostgreSQL database offline. Switching to client-side localStorage fallback.' }, { status: 503 });
    }

    if (!storeId) {
      const products = await db.product.findMany();
      return NextResponse.json({ success: true, products });
    }

    const storeProducts = await db.storeProduct.findMany({
      where: { storeId },
      include: { product: true }
    });

    const inventory = storeProducts.map(sp => ({
      id: sp.id,
      productId: sp.product.id,
      name: sp.product.name,
      category: sp.product.category,
      price: sp.price,
      stockCount: sp.stockCount,
      image: sp.product.image,
      barcode: sp.product.barcode || ''
    }));

    return NextResponse.json({ success: true, inventory });
  } catch (error: unknown) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category, price, stockCount, image, barcode, storeId } = body;

    if (!(await isDbConnected())) {
      return NextResponse.json({ success: false, error: 'PostgreSQL database offline. Switching to client-side localStorage fallback.' }, { status: 503 });
    }

    if (!name || !price || !stockCount || !storeId) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Ensure we have a valid seller user in the database to satisfy constraint
    const sellerId = await resolveSellerId();

    // 2. Ensure we have a valid Store in the database to satisfy constraint
    const targetStoreId = storeId || 'store-krishnadairy';
    let store = await db.store.findUnique({ where: { id: targetStoreId } });
    if (!store) {
      // Check if any store exists, otherwise create default
      const anyStore = await db.store.findFirst();
      if (anyStore) {
        store = anyStore;
      } else {
        store = await db.store.create({
          data: {
            id: targetStoreId,
            name: 'Sri Krishna Dairy & Provisions',
            type: 'Dairy & Grocery',
            address: 'No 12, 12th Main Rd, Doopanahalli, Indiranagar, Bengaluru',
            latitude: 12.9702,
            longitude: 77.6368,
            phone: '+91 98450 12345',
            logo: 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=100&h=100&fit=crop',
            banner: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
            openTime: '06:00 AM',
            closeTime: '09:30 PM',
            verified: true,
          }
        });
      }
    }

    // 3. Resolve or create Product record
    const resolvedBarcode = barcode || `LK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    let product = await db.product.findUnique({
      where: { barcode: resolvedBarcode }
    });

    if (!product) {
      product = await db.product.create({
        data: {
          name,
          description: `Fresh in-store ${category.toLowerCase()} product.`,
          category,
          image: image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop',
          brand: 'Local',
          barcode: resolvedBarcode,
          price: parseFloat(price),
          stock: parseInt(stockCount),
          sellerId
        }
      });
    }

    // 4. Create or update store inventory connection
    const storeProduct = await db.storeProduct.upsert({
      where: {
        storeId_productId: {
          storeId: store.id,
          productId: product.id
        }
      },
      update: {
        price: parseFloat(price),
        stockCount: parseInt(stockCount),
        isAvailable: true
      },
      create: {
        storeId: store.id,
        productId: product.id,
        price: parseFloat(price),
        stockCount: parseInt(stockCount),
        isAvailable: true
      }
    });

    return NextResponse.json({
      success: true,
      product: {
        id: storeProduct.id,
        productId: product.id,
        name: product.name,
        category: product.category,
        price: storeProduct.price,
        stockCount: storeProduct.stockCount,
        image: product.image,
        barcode: product.barcode
      }
    });
  } catch (error: unknown) {
    console.error('Error creating product:', error);
    return NextResponse.json({ success: false, error: 'Failed to create product' }, { status: 500 });
  }
}
