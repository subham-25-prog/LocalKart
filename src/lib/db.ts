import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';
const sqliteUrl =
  databaseUrl === 'file:./dev.db'
    ? `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`
    : databaseUrl;
const adapter = new PrismaBetterSqlite3({ url: sqliteUrl });

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

/**
 * Probes the database with a lightweight `SELECT 1` and reports whether it is
 * reachable. API routes use this to decide between live Prisma queries and
 * their offline localStorage fallback responses. Never throws.
 */
export async function isDbConnected(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
