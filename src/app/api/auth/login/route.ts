import { NextResponse } from 'next/server';
import { db, isDbConnected } from '@/lib/db';
import { getErrorMessage } from '@/lib/apiHelpers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, role } = body;

    if (!email || !password || !role) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const emailKey = email.toLowerCase().trim();

    if (await isDbConnected()) {
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

  } catch (error: unknown) {
    console.error('Error during login:', error);
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}
