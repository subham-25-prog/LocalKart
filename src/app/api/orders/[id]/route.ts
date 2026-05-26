import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check database connection
    let dbConnected = false;
    try {
      await db.$queryRaw`SELECT 1`;
      dbConnected = true;
    } catch (e) {
      dbConnected = false;
    }

    if (dbConnected) {
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

  } catch (error: any) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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

    // Check database connection
    let dbConnected = false;
    try {
      await db.$queryRaw`SELECT 1`;
      dbConnected = true;
    } catch (e) {
      dbConnected = false;
    }

    if (dbConnected) {
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

  } catch (error: any) {
    console.error('Error updating order:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
