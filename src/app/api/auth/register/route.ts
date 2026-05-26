import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, password, role } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const emailKey = email.toLowerCase().trim();

    // Check if Postgres database is reachable
    let dbConnected = false;
    try {
      await db.$queryRaw`SELECT 1`;
      dbConnected = true;
    } catch (e) {
      console.warn("Postgres is unreachable, using failover memory auth:", e);
    }

    if (dbConnected) {
      // Postgres Mode: verify email uniqueness in Postgres
      const existing = await (db as any).user.findUnique({
        where: { email: emailKey }
      });

      if (existing) {
        return NextResponse.json({ success: false, error: 'An account with this email already exists' }, { status: 400 });
      }

      const membership = role === 'seller' ? 'Silver Merchant' : 'Silver Explorer';

      const newUser = await (db as any).user.create({
        data: {
          name,
          email: emailKey,
          phone: phone || '+91 98765 43210',
          password, // Mock plain password storage
          role,
          membership
        }
      });

      return NextResponse.json({
        success: true,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          membership: newUser.membership
        }
      });
    }

    // Failover Mode: Success response for LocalStorage sync
    const membership = role === 'seller' ? 'Silver Merchant' : 'Silver Explorer';
    return NextResponse.json({
      success: true,
      user: {
        id: `mock-user-${Date.now()}`,
        name,
        email: emailKey,
        phone: phone || '+91 98765 43210',
        role,
        membership
      },
      warning: "Running in offline fallback mode. Profile saved in LocalStorage."
    });

  } catch (error: any) {
    console.error('Error during registration:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
