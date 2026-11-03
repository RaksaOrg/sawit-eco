import { hasPermission, canApproveOrder, normalizeRole, APPROVAL_LIMIT_MANAGER_IDR } from './rbac';

describe('rbac & permission tests', () => {
  it('normalizes role properly with PEKERJA default', () => {
    expect(normalizeRole('owner')).toBe('OWNER');
    expect(normalizeRole('unknown_role')).toBe('PEKERJA');
  });

  it('evaluates permissions according to Phase 2 matrix', () => {
    expect(hasPermission('OWNER', 'commerce:approve_high')).toBe(true);
    expect(hasPermission('MANAGER', 'commerce:approve_high')).toBe(false);
    expect(hasPermission('MANAGER', 'commerce:approve_low')).toBe(true);
    expect(hasPermission('AGRONOM', 'agronomy:review')).toBe(true);
    expect(hasPermission('MANDOR', 'agronomy:review')).toBe(false);
    expect(hasPermission('PEKERJA', 'dispatch:execute')).toBe(true);
    expect(hasPermission('PEKERJA', 'commerce:cart_checkout')).toBe(false);
  });

  it('evaluates approval threshold limits correctly', () => {
    expect(canApproveOrder('OWNER', 10_000_000)).toBe(true);
    expect(canApproveOrder('MANAGER', APPROVAL_LIMIT_MANAGER_IDR)).toBe(true);
    expect(canApproveOrder('MANAGER', APPROVAL_LIMIT_MANAGER_IDR + 1)).toBe(false);
    expect(canApproveOrder('MANDOR', 100_000)).toBe(false);
  });
});
