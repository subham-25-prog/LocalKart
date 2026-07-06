import { db } from './db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/** Default seller record used to satisfy the product ownership constraint. */
const DEFAULT_SELLER_BASE = {
  email: 'default.seller@localkart.com',
  name: 'Default Seller',
  phone: '+91 98450 12345',
  role: 'seller',
  membership: 'Silver Merchant',
} as const;

/**
 * Resolves a valid seller user id for product creation. Prefers an explicit
 * `sellerId` when it maps to an existing user, otherwise reuses any existing
 * seller, creating the shared default seller when none exists.
 */
export async function resolveSellerId(sellerId?: string): Promise<string> {
  if (sellerId) {
    const seller = await db.user.findUnique({ where: { id: sellerId } });
    if (seller) return seller.id;
  }

  let seller = await db.user.findFirst({ where: { role: 'seller' } });
  if (!seller) {
    const randomPassword = crypto.randomBytes(32).toString('hex');
    seller = await db.user.create({
      data: { ...DEFAULT_SELLER_BASE, password: await bcrypt.hash(randomPassword, 12) },
    });
  }

  return seller.id;
}
