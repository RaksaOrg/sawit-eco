'use client';

import React from 'react';
import '@/src/i18n/config';
import '@ui5/webcomponents/dist/Assets.js';
import '@ui5/webcomponents-fiori/dist/Assets.js';
import '@ui5/webcomponents-fiori/dist/illustrations/AllIllustrations.js';
import '@ui5/webcomponents-icons/dist/AllIcons.js';
import { ThemeProvider } from '@ui5/webcomponents-react';
import { setTheme } from '@ui5/webcomponents-base/dist/config/Theme.js';

export default function FioriProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    setTheme('sap_fiori_3');
    document.documentElement.dataset.fioriTheme = 'sap_fiori_3';
  }, []);

  return <ThemeProvider>{children}</ThemeProvider>;
}
