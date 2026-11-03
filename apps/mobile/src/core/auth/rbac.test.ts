import { hasPermission } from './rbac';

describe('mobile RBAC', () => {
  it('grants field permissions to mandor', () => {
    expect(hasPermission('MANDOR', 'attendance:record_own')).toBe(true);
    expect(hasPermission('MANDOR', 'agronomy:capture')).toBe(true);
    expect(hasPermission('MANDOR', 'commerce:approve')).toBe(false);
  });

  it('grants approvals only to owner and manager', () => {
    expect(hasPermission('OWNER', 'commerce:approve')).toBe(true);
    expect(hasPermission('MANAGER', 'commerce:approve')).toBe(true);
    expect(hasPermission('PEKERJA', 'commerce:view')).toBe(false);
  });

  it('denies unknown session roles', () => {
    expect(hasPermission(undefined, 'tasks:view')).toBe(false);
  });
});
