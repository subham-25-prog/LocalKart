import { NextResponse } from 'next/server';
import { db, isDbConnected } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, password, role } = body;

    const validRoles = ['buyer', 'seller'];
    if (!name || !email || !password || !role) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    if (!validRoles.includes(role)) {
      return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ success: false, error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const emailKey = email.toLowerCase().trim();

    if (await isDbConnected()) {
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
          password: await bcrypt.hash(password, 12),
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

  } catch (error: unknown) {
    console.error('Error during registration:', error);
    return NextResponse.json({ success: false, error: 'Registration failed' }, { status: 500 });
  }
}
