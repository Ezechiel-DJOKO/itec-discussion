import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'ITEC Discuss',
  description: 'Espace privé collaboratif ITEC',
  applicationName: 'ITEC Discuss',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ITEC Discuss',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/logo-itec.jpg',
    apple: '/logo-itec.jpg',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#0A2540',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}