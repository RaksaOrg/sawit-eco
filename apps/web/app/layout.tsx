import type { Metadata } from 'next';
import FioriProvider from '@/components/fiori/FioriProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'SAP Sawit Ecosystem',
  description: 'Enterprise Palm Oil Field Management with SAP Fiori 3',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <FioriProvider>{children}</FioriProvider>
      </body>
    </html>
  );
}
