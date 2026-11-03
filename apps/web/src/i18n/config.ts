import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import idAgronomy from './locales/id/agronomy.json';
import idAuth from './locales/id/auth.json';
import idCommerce from './locales/id/commerce.json';
import idCommon from './locales/id/common.json';
import idDashboard from './locales/id/dashboard.json';
import idHris from './locales/id/hris.json';
import idLearning from './locales/id/learning.json';
import idTasks from './locales/id/tasks.json';
import enAgronomy from './locales/en/agronomy.json';
import enAuth from './locales/en/auth.json';
import enCommerce from './locales/en/commerce.json';
import enCommon from './locales/en/common.json';
import enDashboard from './locales/en/dashboard.json';
import enHris from './locales/en/hris.json';
import enLearning from './locales/en/learning.json';
import enTasks from './locales/en/tasks.json';

const namespaces = [
  'common',
  'auth',
  'agronomy',
  'commerce',
  'learning',
  'hris',
  'tasks',
  'dashboard',
] as const;

export function handleMissingKey(key: string): string {
  const message = `[i18n] Missing translation key: ${key}`;
  if (process.env.NODE_ENV === 'production') {
    console.error(message);
    return key;
  }
  throw new Error(message);
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: namespaces,
    parseMissingKeyHandler: handleMissingKey,
    resources: {
      id: {
        common: idCommon,
        auth: idAuth,
        agronomy: idAgronomy,
        commerce: idCommerce,
        learning: idLearning,
        hris: idHris,
        tasks: idTasks,
        dashboard: idDashboard,
      },
      en: {
        common: enCommon,
        auth: enAuth,
        agronomy: enAgronomy,
        commerce: enCommerce,
        learning: enLearning,
        hris: enHris,
        tasks: enTasks,
        dashboard: enDashboard,
      },
    },
    interpolation: { escapeValue: false },
  });
}

if (!i18n.isInitialized) {
  throw new Error('[i18n] Failed to initialize i18next');
}

export default i18n;
