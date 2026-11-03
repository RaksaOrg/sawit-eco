import { createTranslator } from '../../src/i18n';

describe('mobile i18n dictionary translator', () => {
  it('translates Indonesian correctly', () => {
    const t = createTranslator('id');
    expect(t('app.name')).toBe('SawitEco');
    expect(t('today.title')).toBe('Tugas Hari Ini');
    expect(t('auth.submit')).toBe('Masuk');
  });

  it('translates English correctly', () => {
    const t = createTranslator('en');
    expect(t('app.name')).toBe('SawitEco');
    expect(t('today.title')).toBe('Today Tasks');
    expect(t('auth.submit')).toBe('Sign In');
  });
});
