import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Blind Dram - ブラインドテイスティング会支援',
  description: 'ウイスキーブラインドテイスティング会を支援するデジタル司会',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="antialiased selection:bg-amber-500/20 selection:text-stone-50">
        {children}
      </body>
    </html>
  );
}


