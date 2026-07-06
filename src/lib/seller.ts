import { db } from './db';

/** Default seller record used to satisfy the product ownership constraint. */
const DEFAULT_SELLER = {
  email: 'default.seller@localkart.com',
  name: 'Default Seller',
  phone: '+91 98450 12345',
  password: 'password123',
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
    seller = await db.user.create({ data: { ...DEFAULT_SELLER } });
  }

  return seller.id;
}
