import { UserRole } from './session';

export type Permission =
  | 'attendance:record_own'
  | 'attendance:record_team'
  | 'tasks:view'
  | 'tasks:execute'
  | 'learning:view'
  | 'learning:quiz'
  | 'agronomy:capture'
  | 'agronomy:diagnose'
  | 'commerce:view'
  | 'commerce:cart'
  | 'commerce:approve';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  OWNER: [
    'attendance:record_own',
    'attendance:record_team',
    'tasks:view',
    'tasks:execute',
    'learning:view',
    'learning:quiz',
    'agronomy:capture',
    'agronomy:diagnose',
    'commerce:view',
    'commerce:cart',
    'commerce:approve',
  ],
  MANAGER: [
    'attendance:record_own',
    'attendance:record_team',
    'tasks:view',
    'tasks:execute',
    'learning:view',
    'learning:quiz',
    'agronomy:capture',
    'agronomy:diagnose',
    'commerce:view',
    'commerce:cart',
    'commerce:approve',
  ],
  AGRONOM: [
    'tasks:view',
    'learning:view',
    'agronomy:capture',
    'agronomy:diagnose',
    'commerce:view',
  ],
  ADMIN_COMMERCE: ['commerce:view', 'commerce:cart'],
  MANDOR: [
    'attendance:record_own',
    'attendance:record_team',
    'tasks:view',
    'tasks:execute',
    'learning:view',
    'learning:quiz',
    'agronomy:capture',
    'agronomy:diagnose',
    'commerce:view',
    'commerce:cart',
  ],
  PEKERJA: [
    'attendance:record_own',
    'tasks:view',
    'tasks:execute',
    'learning:view',
    'learning:quiz',
  ],
};

export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
