import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readString, fetchOpenFoodFactsProduct } from '@/lib/openFoodFacts';


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
    const offProduct = await fetchOpenFoodFactsProduct(barcode);
    if (offProduct) {
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

    return NextResponse.json({ success: false, error: 'Product barcode not found in database or external registry' }, { status: 404 });
  } catch (error: unknown) {
    console.error('Error fetching scanned product:', error);
    return NextResponse.json({ success: false, error: 'Failed to scan product' }, { status: 500 });
  }
}
