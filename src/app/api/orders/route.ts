import { NextResponse } from 'next/server';
import { db, isDbConnected } from '@/lib/db';


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const buyerEmail = searchParams.get('buyerEmail');

    if (await isDbConnected()) {
      let orders = [];
      if (storeId) {
        orders = await (db as any).order.findMany({
          where: { storeId },
          include: { items: true },
          orderBy: { createdAt: 'desc' }
        });
      } else if (buyerEmail) {
        orders = await (db as any).order.findMany({
          where: { buyerEmail },
          include: { items: true },
          orderBy: { createdAt: 'desc' }
        });
      } else {
        orders = await (db as any).order.findMany({
          include: { items: true },
          orderBy: { createdAt: 'desc' }
        });
      }

      // Map back to standard client interface
      const mapped = orders.map((o: any) => ({
        id: o.id,
        customerName: o.buyerName,
        items: o.items.map((i: any) => `${i.quantity}x ${i.productName}`).join(', '),
        total: o.total,
        status: o.status,
        timestamp: 'Just now' // simple relative mapping
      }));

      return NextResponse.json({ success: true, orders: mapped });
    }

    // Failover fallback mode (return empty success so client reads local storage)
    return NextResponse.json({ success: true, orders: [], fallback: true });

  } catch (error: unknown) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeId, buyerName, buyerPhone, buyerEmail, address, items, total, deliveryMethod = 'DELIVERY', deliveryFee = 0 } = body;

    if (!storeId || !buyerName || !buyerPhone || !items || items.length === 0 || !total) {
      return NextResponse.json({ success: false, error: 'Missing required checkout parameters' }, { status: 400 });
    }

    const orderId = `LK-${Math.floor(1000 + Math.random() * 9000)}`;

    if (await isDbConnected()) {
      // 1. Create order record
      const newOrder = await (db as any).order.create({
        data: {
          storeId,
          buyerName,
          buyerPhone,
          buyerEmail: buyerEmail || null,
          address: address || 'No address provided',
          total: parseFloat(total),
          status: 'Received',
          deliveryMethod,
          deliveryFee: deliveryMethod === 'PICKUP' ? 0 : deliveryFee
        }
      });

      // 2. Create order item details
      for (const item of items) {
        await (db as any).orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            productName: item.name,
            price: parseFloat(item.price),
            quantity: parseInt(item.qty)
          }
        });
      }

      return NextResponse.json({
        success: true,
        order: {
          id: orderId, // return LK-xxxx formatted ID for premium UI rendering
          dbId: newOrder.id,
          customerName: buyerName,
          items: items.map((i: any) => `${i.qty}x ${i.name}`).join(', '),
          total: parseFloat(total),
          status: 'Received',
          timestamp: 'Just now'
        }
      });
    }

    // Fallback Success payload for local synchronization
    return NextResponse.json({
      success: true,
      order: {
        id: orderId,
        customerName: buyerName,
        items: items.map((i: any) => `${i.qty}x ${i.name}`).join(', '),
        total: parseFloat(total),
        status: 'Received',
        timestamp: 'Just now',
        deliveryMethod,
        deliveryFee: deliveryMethod === 'PICKUP' ? 0 : deliveryFee
      },
      warning: "PostgreSQL offline. Simulated local provisions order synced."
    });

  } catch (error: unknown) {
    console.error('Error placing order:', error);
    return NextResponse.json({ success: false, error: 'Failed to place order' }, { status: 500 });
  }
}
