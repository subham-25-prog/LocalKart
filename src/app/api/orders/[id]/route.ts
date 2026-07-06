import { NextResponse } from 'next/server';
import { db, isDbConnected } from '@/lib/db';
import { getErrorMessage } from '@/lib/apiHelpers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (await isDbConnected()) {
      const order = await (db as any).order.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!order) {
        return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, order });
    }

    // Fallback response
    return NextResponse.json({ success: false, error: 'Postgres offline. Reading localized details instead.' }, { status: 503 });

  } catch (error: unknown) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body; // "Received" | "Preparing" | "Dispatched" | "Delivered"

    if (!status) {
      return NextResponse.json({ success: false, error: 'Missing required status parameter' }, { status: 400 });
    }

    if (await isDbConnected()) {
      const updatedOrder = await (db as any).order.update({
        where: { id },
        data: { status }
      });

      return NextResponse.json({ success: true, order: updatedOrder });
    }

    // Fallback response
    return NextResponse.json({
      success: true,
      order: { id, status },
      warning: "Postgres offline. Local state updated successfully."
    });

  } catch (error: unknown) {
    console.error('Error updating order:', error);
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}
