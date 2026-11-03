import { prisma } from './prisma';
import { getSessionTenantId } from './auth';

export async function getCurrentTenant() {
  const sessionTenantId = await getSessionTenantId();
  if (sessionTenantId) {
    const t = await prisma.tenant.findUnique({ where: { id: sessionTenantId } });
    if (t) return t;
  }
  const id = process.env.TENANT_ID;
  if (id) return prisma.tenant.findUnique({ where: { id } });
  return null;
}
