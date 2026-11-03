'use client';

import React from 'react';
import '@ui5/webcomponents-fiori/dist/illustrations/NoData.js';
import { BusyIndicator, Button, IllustratedMessage, MessageStrip } from '@ui5/webcomponents-react';

export function FioriLoadingState({ height = '200px' }: { height?: string }) {
  return (
    <div
      style={{
        width: '100%',
        height,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <BusyIndicator active size="M" delay={0} />
    </div>
  );
}

export function FioriEmptyState({
  titleText,
  subtitleText,
  actionText,
  onAction,
}: {
  titleText: string;
  subtitleText: string;
  actionText?: string;
  onAction?: () => void;
}) {
  return (
    <IllustratedMessage name="NoData" titleText={titleText} subtitleText={subtitleText}>
      {actionText ? (
        <Button design="Emphasized" onClick={onAction}>
          {actionText}
        </Button>
      ) : null}
    </IllustratedMessage>
  );
}

export function FioriErrorState({ message }: { message: string }) {
  return (
    <MessageStrip design="Negative" hideCloseButton>
      {message}
    </MessageStrip>
  );
}

export function FioriPageSkeleton() {
  return (
    <div style={{ padding: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
      <div
        style={{
          height: '2.5rem',
          width: '40%',
          backgroundColor: 'var(--sapGroup_ContentBackground)',
          borderRadius: '0.25rem',
          marginBottom: '1rem',
          opacity: 0.6,
        }}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              height: '6rem',
              backgroundColor: 'var(--sapTile_Background)',
              borderRadius: '0.5rem',
              border: '1px solid var(--sapList_BorderColor)',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BusyIndicator active size="S" delay={0} />
          </div>
        ))}
      </div>
      <div
        style={{
          height: '18rem',
          backgroundColor: 'var(--sapTile_Background)',
          borderRadius: '0.5rem',
          border: '1px solid var(--sapList_BorderColor)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <BusyIndicator active size="L" delay={0} />
      </div>
    </div>
  );
}
