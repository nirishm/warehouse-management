import type { Metadata } from 'next';
import './globals.css';
import { OfflineBanner } from '@/components/pwa/offline-banner';
import { PwaRegister } from '@/components/pwa/pwa-register';

export const metadata: Metadata = {
  title: 'WareOS',
  description: 'Inventory & Warehouse Management',
  manifest: '/manifest.json',
  themeColor: '#F27B35',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'WareOS',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <OfflineBanner />
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
