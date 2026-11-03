export type AppRole = 'OWNER' | 'MANAGER' | 'AGRONOM' | 'ADMIN_COMMERCE' | 'MANDOR' | 'PEKERJA';

export type Permission =
  | 'tenant:manage'
  | 'employee:read'
  | 'employee:write'
  | 'attendance:record_own'
  | 'attendance:record_team'
  | 'attendance:correct'
  | 'dispatch:create'
  | 'dispatch:execute'
  | 'learning:manage'
  | 'learning:assign'
  | 'learning:take'
  | 'agronomy:diagnose'
  | 'agronomy:review'
  | 'commerce:manage_catalog'
  | 'commerce:cart_checkout'
  | 'commerce:approve_low'
  | 'commerce:approve_high'
  | 'commerce:view_gmv'
  | 'pdp:view_audit';

const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  OWNER: [
    'tenant:manage',
    'employee:read',
    'employee:write',
    'attendance:record_own',
    'attendance:record_team',
    'attendance:correct',
    'dispatch:create',
    'dispatch:execute',
    'learning:manage',
    'learning:assign',
    'learning:take',
    'agronomy:diagnose',
    'agronomy:review',
    'commerce:manage_catalog',
    'commerce:cart_checkout',
    'commerce:approve_low',
    'commerce:approve_high',
    'commerce:view_gmv',
    'pdp:view_audit',
  ],
  MANAGER: [
    'employee:read',
    'employee:write',
    'attendance:record_own',
    'attendance:record_team',
    'attendance:correct',
    'dispatch:create',
    'dispatch:execute',
    'learning:assign',
    'agronomy:diagnose',
    'commerce:cart_checkout',
    'commerce:approve_low',
  ],
  AGRONOM: [
    'employee:read',
    'learning:manage',
    'learning:assign',
    'agronomy:diagnose',
    'agronomy:review',
  ],
  ADMIN_COMMERCE: ['commerce:manage_catalog', 'commerce:view_gmv', 'pdp:view_audit'],
  MANDOR: [
    'attendance:record_own',
    'attendance:record_team',
    'dispatch:execute',
    'learning:assign',
    'learning:take',
    'agronomy:diagnose',
    'commerce:cart_checkout',
  ],
  PEKERJA: ['attendance:record_own', 'dispatch:execute', 'learning:take'],
};

export const APPROVAL_LIMIT_MANAGER_IDR = 2_000_000;
export const APPROVAL_LIMIT_OWNER_IDR = 5_000_000;

export function normalizeRole(role: string): AppRole {
  const upper = role.toUpperCase();
  if (upper in ROLE_PERMISSIONS) return upper as AppRole;
  return 'PEKERJA';
}

export function hasPermission(role: string, permission: Permission): boolean {
  const norm = normalizeRole(role);
  return ROLE_PERMISSIONS[norm].includes(permission);
}

export function canApproveOrder(role: string, totalHarga: number): boolean {
  const norm = normalizeRole(role);
  if (norm === 'OWNER') return true;
  if (norm === 'MANAGER') return totalHarga <= APPROVAL_LIMIT_MANAGER_IDR;
  return false;
}
