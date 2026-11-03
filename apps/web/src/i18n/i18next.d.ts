import 'i18next';
import type common from './locales/id/common.json';
import type auth from './locales/id/auth.json';
import type agronomy from './locales/id/agronomy.json';
import type commerce from './locales/id/commerce.json';
import type dashboard from './locales/id/dashboard.json';
import type hris from './locales/id/hris.json';
import type learning from './locales/id/learning.json';
import type tasks from './locales/id/tasks.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    returnNull: false;
    resources: {
      common: typeof common;
      auth: typeof auth;
      agronomy: typeof agronomy;
      commerce: typeof commerce;
      dashboard: typeof dashboard;
      hris: typeof hris;
      learning: typeof learning;
      tasks: typeof tasks;
    };
  }
}
