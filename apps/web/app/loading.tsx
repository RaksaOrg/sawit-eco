'use client';

import React from 'react';
import { BusyIndicator } from '@ui5/webcomponents-react';

export default function RootLoading() {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--sapBackgroundColor)',
      }}
    >
      <BusyIndicator active size="L" delay={0} />
    </div>
  );
}
