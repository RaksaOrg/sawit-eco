import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/auth';
import AttendanceBoard from './AttendanceBoard';

export const dynamic = 'force-dynamic';

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const tenant = await requireTenant();
  const { date: dateParam } = await searchParams;
  const dateStr = dateParam || new Date().toISOString().slice(0, 10);
  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [records, employees, blocks] = await Promise.all([
    prisma.attendance.findMany({
      where: { tenantId: tenant.id, workDate: { gte: start, lt: end } },
      include: { user: { select: { nama: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, nama: true },
      orderBy: { nama: 'asc' },
    }),
    prisma.block.findMany({
      where: { tenantId: tenant.id },
      select: { kode: true, luasHa: true },
      orderBy: { kode: 'asc' },
    }),
  ]);

  const mappedRecords = records.map((r) => ({
    id: r.id,
    employee: r.user.nama,
    role: r.user.role,
    blockCode: r.blokKode,
    status: r.status,
    source: r.source,
    verificationStatus: r.verificationStatus,
    hkValue: r.hkValue,
  }));

  const summary = {
    present: mappedRecords.filter((r) => r.status === 'PRESENT').length,
    halfDay: mappedRecords.filter((r) => r.status === 'HALF_DAY').length,
    absent: mappedRecords.filter((r) => r.status === 'ABSENT' || r.status === 'LEAVE').length,
    totalHk: Number(mappedRecords.reduce((sum, r) => sum + r.hkValue, 0).toFixed(2)),
  };

  return (
    <AttendanceBoard
      tenantNama={tenant.nama}
      date={dateStr}
      records={mappedRecords}
      employees={employees}
      blocks={blocks}
      summary={summary}
    />
  );
}
