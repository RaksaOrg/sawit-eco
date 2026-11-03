export type PiiField = 'phone' | 'email' | 'name' | 'address';

export interface MaskedPii {
  text: string;
  fieldsMasked: PiiField[];
  aliases: Record<string, string>;
}

const PHONE_PATTERN = /(?:\+62|62|0)8\d{7,11}/g;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const NAME_PATTERN =
  /\b(nama|petani|pemasok|supplier|mandor)\s*[:=]?\s*((?:[A-Z][a-z]+)(?:\s+(?![Aa]lamat|[Aa]ddress)[A-Z][a-z]+)*)/g;
const ADDRESS_PATTERN =
  /\b(alamat|address)\s*[:=]?\s*((?:(?!\s(?:nama|petani|pemasok|supplier|mandor)\s*[:=])[^\n,;])+)/gi;

function aliasFor(field: 'name' | 'address', index: number): string {
  if (field === 'address') return 'REDACTED_FOR_PRIVACY';
  return index === 1 ? 'SUPPLIER_001' : `PEKERJA_${String(index).padStart(3, '0')}`;
}

export function maskPii(input: string): MaskedPii {
  const fields = new Set<PiiField>();
  const aliases: Record<string, string> = {};
  let nameIndex = 0;
  let text = input;

  text = text.replace(PHONE_PATTERN, (match) => {
    fields.add('phone');
    aliases[match] = 'REDACTED_FOR_PRIVACY';
    return 'REDACTED_FOR_PRIVACY';
  });

  text = text.replace(EMAIL_PATTERN, (match) => {
    fields.add('email');
    aliases[match] = 'REDACTED_FOR_PRIVACY';
    return 'REDACTED_FOR_PRIVACY';
  });

  text = text.replace(NAME_PATTERN, (_match, label: string, name: string) => {
    const cleaned = name.trim();
    fields.add('name');
    nameIndex += 1;
    const alias = aliasFor('name', nameIndex);
    aliases[cleaned] = alias;
    return `${label}: ${alias}`;
  });

  text = text.replace(ADDRESS_PATTERN, (_match, label: string, address: string) => {
    const cleaned = address.trim();
    fields.add('address');
    aliases[cleaned] = aliasFor('address', 1);
    return `${label}: ${aliasFor('address', 1)}`;
  });

  return { text, fieldsMasked: [...fields], aliases };
}

export function maskSupplierName(name: string, index: number): string {
  if (!name.trim()) return 'SUPPLIER_000';
  return `SUPPLIER_${String(index).padStart(3, '0')}`;
}

export function hasUnmaskedPii(text: string): boolean {
  PHONE_PATTERN.lastIndex = 0;
  EMAIL_PATTERN.lastIndex = 0;
  NAME_PATTERN.lastIndex = 0;
  ADDRESS_PATTERN.lastIndex = 0;

  return (
    PHONE_PATTERN.test(text) ||
    EMAIL_PATTERN.test(text) ||
    NAME_PATTERN.test(text) ||
    ADDRESS_PATTERN.test(text)
  );
}
