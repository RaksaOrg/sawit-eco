'use client';

import React from 'react';
import { BusyIndicator } from '@ui5/webcomponents-react';
import FioriBgWave from '@/components/fiori/FioriBgWave';

export default function AuthLoading() {
  return (
    <div className="auth-page">
      <FioriBgWave />
      <main className="auth-main">
        <BusyIndicator active size="L" delay={0} />
      </main>
    </div>
  );
}
