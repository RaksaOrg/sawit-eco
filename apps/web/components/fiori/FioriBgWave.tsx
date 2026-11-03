'use client';

import React from 'react';

export type FioriBgWaveProps = React.SVGProps<SVGSVGElement>;

export default function FioriBgWave({ className, ...props }: FioriBgWaveProps) {
  const uid = React.useId().replace(/:/g, '');
  const id = (name: string) => `${name}-${uid}`;

  return (
    <svg
      viewBox="0 0 1024 1536"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      className={className ? `fiori-bg-wave ${className}` : 'fiori-bg-wave'}
      {...props}
    >
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--sapBrandColor)" stopOpacity="0.28" />
          <stop offset="0.35" stopColor="var(--sapBrandColor)" stopOpacity="0.18" />
          <stop offset="0.7" stopColor="var(--sapHighlightColor)" stopOpacity="0.08" />
          <stop offset="1" stopColor="var(--sapBackgroundColor)" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={id('glow')} cx="65%" cy="22%" r="65%">
          <stop offset="0" stopColor="var(--sapTile_Background)" stopOpacity="0.25" />
          <stop offset="1" stopColor="var(--sapTile_Background)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('waveBack')} x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0" stopColor="var(--sapHighlightColor)" stopOpacity="0.16" />
          <stop offset="1" stopColor="var(--sapBackgroundColor)" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id={id('waveFront')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--sapBrandColor)" stopOpacity="0.14" />
          <stop offset="1" stopColor="var(--sapBackgroundColor)" stopOpacity="0.04" />
        </linearGradient>
      </defs>

      <rect width="1024" height="1536" fill="var(--sapBackgroundColor)" />
      <rect width="1024" height="1536" fill={`url(#${id('sky')})`} />
      <rect width="1024" height="1536" fill={`url(#${id('glow')})`} />
      <path
        d="M0 1090 C210 1035 392 1078 566 1136 C740 1194 894 1196 1024 1168 V1536 H0 Z"
        fill={`url(#${id('waveBack')})`}
      />
      <path
        d="M0 1280 C236 1236 430 1272 612 1324 C790 1375 918 1370 1024 1344 V1536 H0 Z"
        fill={`url(#${id('waveFront')})`}
      />
    </svg>
  );
}
