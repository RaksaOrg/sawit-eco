import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Supabase pooler (session mode) has a small client limit; cap the per-instance
// pool so one server instance cannot exhaust every database connection.
function pooledUrl(raw: string | undefined): string | undefined {
  if (!raw || !raw.startsWith('postgres')) return raw;
  if (raw.includes('connection_limit=')) return raw;
  const sep = raw.includes('?') ? '&' : '?';
  return `${raw}${sep}connection_limit=5&pool_timeout=20`;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: pooledUrl(process.env.DATABASE_URL) } },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
