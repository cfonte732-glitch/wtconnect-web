import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WTConnect',
  description: 'Wintruck Connect — interface web',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
