'use server';

/**
 * @fileOverview A flow to generate a D&D style map in SVG format from a text description.
 *
 * - generateMap - A function that handles the map generation process.
 * - GenerateMapInput - The input type for the generateMap function.
 * - GenerateMapOutput - The return type for the generateMap function.
 */

import { summaryAi as ai } from '@/ai/genkit';
import { z } from 'genkit';

export type GenerateMapInput = string;
export type GenerateMapOutput = string;

export async function generateMap(input: GenerateMapInput): Promise<GenerateMapOutput> {
  return generateMapFlow(input);
}

const generateMapFlow = ai.defineFlow(
  {
    name: 'generateMapFlow',
    inputSchema: z.string().describe('Una descrizione testuale della mappa da generare.'),
    outputSchema: z.string().describe("La stringa di codice SVG della mappa generata."),
  },
  async (prompt) => {
    const { text } = await ai.generate({
        prompt: `Sei un generatore di mappe SVG. Il tuo compito è creare un codice SVG semplice, chiaro e in bianco e nero che rappresenti una mappa fantasy per una campagna di Dungeons and Dragons, basata sulla seguente descrizione. L'SVG deve essere ben strutturato e visualizzabile in qualsiasi browser.

        **Requisiti SVG:**
        - L'output deve essere SOLO il codice SVG grezzo, che inizia con \`<svg>\` e finisce con \`</svg>\`. Non includere commenti o spiegazioni aggiuntive.
        - Usa un elemento radice \`<svg>\` con un \`viewBox\` appropriato (es. '0 0 1000 600') e uno sfondo bianco (\`<rect width="100%" height="100%" fill="white"/>\`).
        - Usa uno \`stroke="black"\` e \`fill="transparent"\` per la maggior parte degli elementi, con \`stroke-width="2"\`.
        - Usa \`<rect>\` per stanze e edifici.
        - Usa \`<path>\` o \`<polyline>\` per corridoi, fiumi o strade.
        - Usa \`<circle>\` o \`<path>\` per elementi speciali come alberi, montagne o trappole.
        - Usa \`<text>\` per le etichette. Usa un font semplice come 'sans-serif' e assicurati che il testo sia leggibile.
        - Mantieni uno stile schematico, da dungeon "vecchia scuola", chiaro e facile da leggere. Non usare colori.

        **Esempio di richiesta:** "Una piccola fortezza in rovina con una torre a nord e un cortile centrale. C'è un ingresso a sud che conduce a una sala grande. Due stanze più piccole si diramano dalla sala grande."

        **Esempio di output atteso:**
        \`\`\`xml
        <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="white"/>
          <rect x="150" y="50" width="100" height="100" style="stroke:black; fill:transparent; stroke-width:2" />
          <text x="200" y="40" text-anchor="middle" font-family="sans-serif" font-size="10">Torre Nord</text>
          <rect x="100" y="150" width="200" height="100" style="stroke:black; fill:transparent; stroke-width:2" />
          <text x="200" y="200" text-anchor="middle" font-family="sans-serif" font-size="10">Sala Grande</text>
          <path d="M 200 250 v 20" style="stroke:black; stroke-width:4" />
          <text x="200" y="280" text-anchor="middle" font-family="sans-serif" font-size="10">Ingresso Sud</text>
        </svg>
        \`\`\`

        **Descrizione per la mappa da generare:** "${prompt}"
        `,
    });
    
    // Clean the output to ensure it's valid SVG
    const svgMatch = text.match(/<svg[\s\S]*?>[\s\S]*?<\/svg>/);
    if (!svgMatch) {
      throw new Error("L'IA non è riuscita a generare un SVG valido.");
    }

    return svgMatch[0];
  }
);
