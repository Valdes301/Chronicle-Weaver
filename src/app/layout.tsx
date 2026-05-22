
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { 
  Literata, 
  Belleza
} from 'next/font/google';

const literata = Literata({ subsets: ['latin'], weight: ['400', '700'], style: ['normal', 'italic'], variable: '--font-literata' });
const bellezza = Belleza({ subsets: ['latin'], weight: ['400'], variable: '--font-belleza' });

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
    <html lang="it" className={`${bellezza.variable} ${literata.variable} dark`}>
      <head />
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
