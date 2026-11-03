import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/auth';
import LearningList from './LearningList';

export const dynamic = 'force-dynamic';

export default async function LearningPage() {
  const tenant = await requireTenant();

  const [modules, mandors] = await Promise.all([
    prisma.learningModule.findMany({
      where: { tenantId: tenant.id },
      include: {
        progressList: {
          select: { userId: true, isCompleted: true },
        },
      },
      orderBy: [{ kategori: 'asc' }, { judul: 'asc' }],
    }),
    prisma.user.findMany({
      where: { tenantId: tenant.id, role: { in: ['MANDOR', 'PEKERJA'] } },
      select: { id: true, nama: true, role: true },
      orderBy: { nama: 'asc' },
    }),
  ]);

  const totalMandor = mandors.length;

  const mapped = modules.map((m) => {
    const selesai = m.progressList.filter((p) => p.isCompleted).length;
    return {
      id: m.id,
      judul: m.judul,
      kategori: m.kategori,
      deskripsi: m.deskripsi,
      durasiMenit: m.durasiMenit,
      konten: m.konten,
      videoUrl: m.videoUrl,
      selesai,
      totalMandor,
      completionPct: totalMandor > 0 ? Math.round((selesai / totalMandor) * 100) : null,
      progressList: m.progressList,
    };
  });

  return <LearningList modules={mapped} users={mandors} tenantNama={tenant.nama} />;
}
