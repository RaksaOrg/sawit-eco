import { getSessionTenantId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import FioriShell from '@/components/fiori/FioriShell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const tenantId = await getSessionTenantId();
  if (!tenantId) return <>{children}</>;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { nama: true, email: true },
  });
  if (!tenant) return <>{children}</>;

  const today = new Date();
  const [tugasOverdue, orderMenunggu, gapTerbuka] = await Promise.all([
    prisma.fieldTask.count({
      where: {
        tenantId,
        status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
        tanggalTarget: { lt: today },
      },
    }),
    prisma.order.count({ where: { tenantId, status: 'SUBMITTED' } }),
    prisma.productGap.count({ where: { tenantId, status: 'OPEN' } }),
  ]);

  return (
    <FioriShell
      tenantName={tenant.nama}
      tenantEmail={tenant.email || ''}
      notificationCount={tugasOverdue + orderMenunggu + gapTerbuka}
    >
      {children}
    </FioriShell>
  );
}
