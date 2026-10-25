import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'AgreedLink - Approve the work. Agree on the changes.', template: '%s | AgreedLink' },
  description:
    'AgreedLink helps freelancers record what a customer approved, track requested changes, and record updated prices and deadlines before extra work begins. Created by JNectar.'
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#071A3D' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
