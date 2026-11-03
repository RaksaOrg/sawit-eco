import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/auth';
import EmployeesList from './EmployeesList';

export const dynamic = 'force-dynamic';

export default async function EmployeesPage() {
  const tenant = await requireTenant();
  const employees = await prisma.user.findMany({
    where: { tenantId: tenant.id },
    include: { team: true },
    orderBy: { nama: 'asc' },
  });

  return (
    <EmployeesList
      tenantNama={tenant.nama}
      employees={employees.map((e) => ({
        id: e.id,
        name: e.nama,
        whatsappNumber: e.waNumber.replace(/(\d{4})\d{4}(\d{3})/, '$1****$2'),
        role: e.role,
        team: e.team?.nama || '—',
      }))}
    />
  );
}
