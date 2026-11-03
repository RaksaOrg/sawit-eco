import { redirect } from 'next/navigation';
import { getSessionTenantId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const tenantId = await getSessionTenantId();
  if (tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });
    if (tenant) redirect('/dashboard');
  }

  // Tenant diambil dari PostgreSQL via Prisma untuk quick demo login
  const showDemo = process.env.DEMO_LOGIN_ENABLED === '1' || process.env.NODE_ENV !== 'production';

  const tenantsRaw = showDemo
    ? await prisma.tenant.findMany({
        where: { email: { not: null } },
        select: { id: true, nama: true, email: true, lokasi: true },
        orderBy: { nama: 'asc' },
        take: 8,
      })
    : [];

  const tenants = tenantsRaw.map((t) => ({
    id: t.id,
    nama: t.nama,
    email: t.email || '',
    lokasi: t.lokasi,
  }));

  return <LoginForm hasError={Boolean(params.error)} tenants={tenants} />;
}
