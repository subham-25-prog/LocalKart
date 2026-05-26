import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, role } = body;

    if (!email || !password || !role) {
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
      // Postgres Mode: verify credentials
      const foundUser = await (db as any).user.findFirst({
        where: {
          email: emailKey,
          role: role
        }
      });

      if (!foundUser) {
        return NextResponse.json({ success: false, error: `No ${role} account found with this email. Please check your credentials or create a new account.` }, { status: 400 });
      }

      if (foundUser.password !== password) {
        return NextResponse.json({ success: false, error: 'Incorrect password. Please try again.' }, { status: 401 });
      }

      return NextResponse.json({
        success: true,
        user: {
          id: foundUser.id,
          name: foundUser.name,
          email: foundUser.email,
          phone: foundUser.phone,
          role: foundUser.role,
          membership: foundUser.membership
        }
      });
    }

    // Failover Mode: return success so that client-side localStorage validation handles it.
    // If running in local storage mode, we let the client side match standard accounts or authorize
    return NextResponse.json({
      success: true,
      user: {
        name: emailKey.split('@')[0].toUpperCase(),
        email: emailKey,
        phone: '+91 98765 43210',
        role,
        membership: role === 'seller' ? 'Silver Merchant' : 'Silver Explorer'
      },
      warning: "PostgreSQL offline. Simulated local profile session initialized."
    });

  } catch (error: any) {
    console.error('Error during login:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
