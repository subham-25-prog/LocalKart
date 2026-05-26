import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

function readString(product: Record<string, unknown>, key: string) {
  const value = product[key];
  return typeof value === 'string' ? value : '';
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ barcode: string }> }
) {
  try {
    const resolvedParams = await params;
    const { barcode } = resolvedParams;

    if (!barcode) {
      return NextResponse.json({ success: false, error: 'Barcode parameter is required' }, { status: 400 });
    }

    // 1. Try local database first
    const product = await db.product.findUnique({
      where: { barcode }
    });

    if (product) {
      return NextResponse.json({ success: true, product });
    }

    // 2. Fallback to Open Food Facts API
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);
      const resp = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (resp.ok) {
        const data = await resp.json() as { status?: number; product?: Record<string, unknown> };
        if (data.status === 1) {
          const offProduct = data.product ?? {};
          
          // Smart Category Mapping
          const rawCategories = readString(offProduct, 'categories').toLowerCase();
          let category = 'Grocery';
          if (rawCategories.includes('milk') || rawCategories.includes('dairy') || rawCategories.includes('cheese') || rawCategories.includes('egg')) {
            category = 'Dairy & Eggs';
          } else if (rawCategories.includes('beverage') || rawCategories.includes('soda') || rawCategories.includes('juice') || rawCategories.includes('drink')) {
            category = 'Grocery';
          } else if (rawCategories.includes('medicine') || rawCategories.includes('health') || rawCategories.includes('pharma')) {
            category = 'Pharmacy';
          } else if (rawCategories.includes('electronic') || rawCategories.includes('device') || rawCategories.includes('phone')) {
            category = 'Electronics';
          }

          const mappedProduct = {
            id: `temp-${barcode}`,
            barcode,
            name: readString(offProduct, 'product_name') || `Product EAN-${barcode}`,
            description: readString(offProduct, 'generic_name') || readString(offProduct, 'product_name') || '',
            image: readString(offProduct, 'image_front_url') || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop',
            category,
            brand: readString(offProduct, 'brands'),
            packaging: readString(offProduct, 'packaging'),
          };
          
          return NextResponse.json({ success: true, product: mappedProduct });
        }
      }
    } catch (apiErr) {
      console.warn('Open Food Facts API error in scan route', apiErr);
    }

    return NextResponse.json({ success: false, error: 'Product barcode not found in database or external registry' }, { status: 404 });
  } catch (error: unknown) {
    console.error('Error fetching scanned product:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
