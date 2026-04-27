import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { 
  Literata, 
  Belleza, 
  Great_Vibes, 
  Dancing_Script, 
  Pinyon_Script, 
  Homemade_Apple, 
  Eagle_Lake,
  Alex_Brush,
  Italianno,
  Indie_Flower,
  Caveat,
  Cinzel,
  Pirata_One,
  Special_Elite,
  Amatic_SC,
  Fondamento,
  Marck_Script,
  MedievalSharp,
  Satisfy,
  Kaushan_Script,
  Playfair_Display,
  Pacifico,
  Fredericka_the_Great,
  Uncial_Antiqua,
  Gochi_Hand,
  Cedarville_Cursive,
  Courgette
} from 'next/font/google';

const literata = Literata({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-literata',
});

const bellezza = Belleza({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-belleza',
});

const greatVibes = Great_Vibes({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-calligraphy',
});

const dancingScript = Dancing_Script({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-handwriting',
});

const pinyonScript = Pinyon_Script({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-elegant',
});

const homemadeApple = Homemade_Apple({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-script',
});

const eagleLake = Eagle_Lake({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-medieval',
});

const alexBrush = Alex_Brush({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-alex',
});

const italianno = Italianno({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-italianno',
});

const indieFlower = Indie_Flower({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-indie',
});

const caveat = Caveat({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-caveat',
});

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-cinzel',
});

const pirataOne = Pirata_One({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-pirata',
});

const specialElite = Special_Elite({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-special',
});

const amaticSc = Amatic_SC({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-amatic',
});

const fondamento = Fondamento({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-fondamento',
});

const marckScript = Marck_Script({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-marck',
});

// New fonts
const medievalSharp = MedievalSharp({ weight: '400', subsets: ['latin'], variable: '--font-medieval-sharp' });
const satisfy = Satisfy({ weight: '400', subsets: ['latin'], variable: '--font-satisfy' });
const kaushan = Kaushan_Script({ weight: '400', subsets: ['latin'], variable: '--font-kaushan' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });
const pacifico = Pacifico({ weight: '400', subsets: ['latin'], variable: '--font-pacifico' });
const fredericka = Fredericka_the_Great({ weight: '400', subsets: ['latin'], variable: '--font-fredericka' });
const uncial = Uncial_Antiqua({ weight: '400', subsets: ['latin'], variable: '--font-uncial' });
const gochi = Gochi_Hand({ weight: '400', subsets: ['latin'], variable: '--font-gochi' });
const cedarville = Cedarville_Cursive({ weight: '400', subsets: ['latin'], variable: '--font-cedarville' });
const courgette = Courgette({ weight: '400', subsets: ['latin'], variable: '--font-courgette' });


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
    <html lang="it" className={`${bellezza.variable} ${literata.variable} ${greatVibes.variable} ${dancingScript.variable} ${pinyonScript.variable} ${homemadeApple.variable} ${eagleLake.variable} ${alexBrush.variable} ${italianno.variable} ${indieFlower.variable} ${caveat.variable} ${cinzel.variable} ${pirataOne.variable} ${specialElite.variable} ${amaticSc.variable} ${fondamento.variable} ${marckScript.variable} ${medievalSharp.variable} ${satisfy.variable} ${kaushan.variable} ${playfair.variable} ${pacifico.variable} ${fredericka.variable} ${uncial.variable} ${gochi.variable} ${cedarville.variable} ${courgette.variable} dark`}>
      <head />
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
