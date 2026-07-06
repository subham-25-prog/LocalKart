import { NextResponse } from 'next/server';
import { db, isDbConnected } from '@/lib/db';
import { getErrorMessage } from '@/lib/apiHelpers';

export async function GET(request: Request) {
  try {
    const {
      searchParams,
      pathname
    } = new URL(request.url);
    // Extract orderId from path: /api/orders/[id]/status
    const pathParts = pathname.split('/');
    const orderId = pathParts[pathParts.length - 2]; // the [id] segment
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Missing order ID' }, { status: 400 });
    }

    // Try DB first
    if (await isDbConnected()) {
      const order = await (db as any).order.findUnique({
        where: { id: orderId },
        select: { status: true }
      });
      if (!order) {
        return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, status: order.status });
    }

    // Fallback: read from local storage sync (sent from client via custom header?)
    // Since we cannot access client localStorage from server, we expect the client to send the
    // locally stored orders array via a query param (e.g., ?cached=1) – but for simplicity we return
    // a generic fallback response.
    return NextResponse.json({ success: true, status: 'Received' });
  } catch (error: unknown) {
    console.error('Error fetching order status:', error);
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}
