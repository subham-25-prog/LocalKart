import { NextResponse } from 'next/server';
import { getProductAvailability } from '@/lib/services';
import { db } from '@/lib/db';
import { getErrorMessage, parseGeoParams } from '@/lib/apiHelpers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    const { searchParams } = new URL(request.url);
    const { lat, lng, dbMode } = parseGeoParams(searchParams);

    const data = await getProductAvailability(id, lat, lng, dbMode);
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Product not found or unavailable in stores' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, ...data });
  } catch (error: unknown) {
    console.error('Error in product availability API:', error);
    return NextResponse.json(
      { success: false, error: getErrorMessage(error, 'Internal Server Error') },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await request.json();
    const { price, stockCount, isAvailable } = body;

    const existing = await db.storeProduct.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Inventory record not found' }, { status: 404 });
    }

    const updated = await db.storeProduct.update({
      where: { id },
      data: {
        price: price !== undefined ? parseFloat(price) : undefined,
        stockCount: stockCount !== undefined ? parseInt(stockCount) : undefined,
        isAvailable: isAvailable !== undefined ? !!isAvailable : undefined
      }
    });

    return NextResponse.json({ success: true, updated });
  } catch (error: unknown) {
    console.error('Error updating inventory item:', error);
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const existing = await db.storeProduct.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Inventory record not found' }, { status: 404 });
    }

    await db.storeProduct.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Item deleted from inventory successfully' });
  } catch (error: unknown) {
    console.error('Error deleting inventory item:', error);
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}
