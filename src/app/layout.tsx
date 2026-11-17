import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Document Assistant',
  description: 'Upload PDFs and ask questions grounded in your documents with page citations.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-text antialiased">{children}</body>
    </html>
  );
}
