import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '셔틀 관리 시스템',
  description: '아카데미 셔틀 동승자 근무일지 및 급여 계산 시스템',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" href="/favicon.png" type="image/png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
