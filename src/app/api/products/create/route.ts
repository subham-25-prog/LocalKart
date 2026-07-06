import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveSellerId } from '@/lib/seller';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const required = ['barcode', 'name', 'price', 'stock'];

    for (const field of required) {
      if (data[field] === undefined || data[field] === null) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 });
      }
    }

    const barcode = String(data.barcode).trim();
    const name = String(data.name).trim();
    const price = Number(data.price);
    const stock = Number(data.stock);
    const discount =
      data.discount === undefined || data.discount === null || data.discount === ''
        ? null
        : Number(data.discount);

    if (!barcode || !name) {
      return NextResponse.json({ error: 'barcode and name are required' }, { status: 400 });
    }
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: 'price must be a valid non-negative number' }, { status: 400 });
    }
    if (!Number.isInteger(stock) || stock < 0) {
      return NextResponse.json({ error: 'stock must be a valid non-negative whole number' }, { status: 400 });
    }
    if (discount !== null && (!Number.isFinite(discount) || discount < 0)) {
      return NextResponse.json({ error: 'discount must be a valid non-negative number' }, { status: 400 });
    }

    const existingProduct = await db.product.findUnique({ where: { barcode } });
    const productPayload = {
      name,
      description: data.description || '',
      image: data.image || '',
      category: data.category || 'Grocery',
      brand: data.brand || '',
      packaging: data.packaging || '',
      price,
      stock,
      discount,
    };

    const product = existingProduct
      ? await db.product.update({
          where: { barcode },
          data: productPayload,
        })
      : await db.product.create({
          data: {
            barcode,
            ...productPayload,
            sellerId: await resolveSellerId(data.sellerId),
          },
        });

    return NextResponse.json({
      ...product,
      existing: Boolean(existingProduct),
    });
  } catch (err) {
    console.error('Product creation error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
