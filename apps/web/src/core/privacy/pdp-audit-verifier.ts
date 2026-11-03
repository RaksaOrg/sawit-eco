import { hasUnmaskedPii } from './pdp-guard';

export interface PdpAuditRecord {
  id: string;
  traceId: string;
  actorId: string;
  dataSubjectRef: string;
  fieldsMasked: string;
  purpose: string;
  createdAt: Date;
}

export function validateZeroPiiLeakage(
  records: Array<{
    rawMessage?: string | null;
    gejala?: string | null;
    finalOutputJson?: string | null;
  }>,
): { isClean: boolean; violations: string[] } {
  const violations: string[] = [];

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (r.rawMessage && hasUnmaskedPii(r.rawMessage)) {
      violations.push(`Violation in rawMessage record #${i}`);
    }
    if (r.gejala && hasUnmaskedPii(r.gejala)) {
      violations.push(`Violation in gejala record #${i}`);
    }
    if (r.finalOutputJson && hasUnmaskedPii(r.finalOutputJson)) {
      violations.push(`Violation in finalOutputJson record #${i}`);
    }
  }

  return {
    isClean: violations.length === 0,
    violations,
  };
}
