import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Literata, Belleza } from 'next/font/google';

const literata = Literata({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-literata',
});

const belleza = Belleza({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-belleza',
});


export const metadata: Metadata = {
  title: 'Tessitore di Cronache',
  description: "Gestisci le tue campagne D&D 5e con la potenza dell'IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${belleza.variable} ${literata.variable} dark`}>
      <head />
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
