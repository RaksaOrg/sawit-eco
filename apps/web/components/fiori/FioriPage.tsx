'use client';

import React from 'react';
import {
  Breadcrumbs,
  BreadcrumbsItem,
  DynamicPage,
  DynamicPageHeader,
  DynamicPageTitle,
  Text,
  Title,
  Toolbar,
} from '@ui5/webcomponents-react';

interface FioriPageProps {
  title: string;
  subtitle?: string;
  breadcrumb?: string;
  actions?: React.ReactNode;
  headerContent?: React.ReactNode;
  children: React.ReactNode;
}

/** Fiori floorplan shell: DynamicPage + DynamicPageTitle (+ optional FilterBar in header). */
export default function FioriPage({
  title,
  subtitle,
  breadcrumb,
  actions,
  headerContent,
  children,
}: FioriPageProps) {
  return (
    <DynamicPage
      headerPinned={false}
      style={{ height: '100%' }}
      titleArea={
        <DynamicPageTitle
          heading={<Title level="H1">{title}</Title>}
          snappedHeading={<Title level="H1">{title}</Title>}
          subheading={subtitle ? <Text>{subtitle}</Text> : undefined}
          breadcrumbs={
            breadcrumb ? (
              <Breadcrumbs>
                <BreadcrumbsItem>{breadcrumb}</BreadcrumbsItem>
                <BreadcrumbsItem>{title}</BreadcrumbsItem>
              </Breadcrumbs>
            ) : undefined
          }
          actionsBar={actions ? <Toolbar>{actions}</Toolbar> : undefined}
        />
      }
      headerArea={
        headerContent ? <DynamicPageHeader>{headerContent}</DynamicPageHeader> : undefined
      }
    >
      <div style={{ padding: '0 0 1.5rem' }}>{children}</div>
    </DynamicPage>
  );
}
