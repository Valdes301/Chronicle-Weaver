'use server';

/**
 * @fileOverview A flow to generate a D&D location with sensory details using AI.
 *
 * - generateLocation - A function that generates location details.
 * - GenerateLocationInput - The input type for the generateLocation function.
 * - GenerateLocationOutput - The return type for the generateLocation function.
 */

import { worldAi as ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateLocationInputSchema = z.object({
  scale: z.enum(['Micro (Stanza, Vicolo)', 'Medio (Quartiere, Piazza, Taverna)', 'Macro (Villaggio, Dungeon, Foresta)']).describe("La scala del luogo da generare."),
  style: z.enum(['Ricco', 'Povero', 'Decadente', 'Sfarzoso', 'Diroccato', 'Incontaminato', 'In costruzione']).describe("Lo stile socio-economico o la condizione del luogo."),
  atmosphere: z.enum(['Sinistro', 'Accogliente', 'Caotico', 'Silenzioso', 'Magico', 'Misterioso']).describe("L'atmosfera generale del luogo."),
  population: z.enum(['Affollato', 'Deserto', 'Abitato da mostri', 'Solo PNG ostili', 'Tranquillo']).describe("Il tipo di popolazione che abita il luogo."),
  campaignSummary: z.string().optional().describe("Il sommario della campagna per coerenza narrativa."),
});

export type GenerateLocationInput = z.infer<typeof GenerateLocationInputSchema>;

const GenerateLocationOutputSchema = z.object({
  title: z.string().describe("Un nome evocativo per il luogo."),
  sight: z.string().describe("Cosa vedono i giocatori (dettagli visivi)."),
  sound: z.string().describe("Cosa sentono i giocatori (dettagli uditivi)."),
  smell: z.string().describe("Cosa odorano i giocatori (dettagli olfattivi)."),
  pointsOfInterest: z.array(z.string()).describe("2-3 punti di interesse specifici nel luogo."),
  secret: z.string().describe("Un segreto o un imprevisto per il Master (non da leggere subito ai PG)."),
});

export type GenerateLocationOutput = z.infer<typeof GenerateLocationOutputSchema>;

export async function generateLocation(input: GenerateLocationInput): Promise<GenerateLocationOutput> {
  return generateLocationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateLocationPrompt',
  input: { schema: GenerateLocationInputSchema },
  output: { schema: GenerateLocationOutputSchema },
  prompt: `Sei un Architetto di Mondi esperto per D&D 5e. Devi generare una scheda dettagliata per un luogo basandoti sui parametri forniti.

**Scala:** {{{scale}}}
**Stile:** {{{style}}}
**Atmosfera:** {{{atmosphere}}}
**Popolazione:** {{{population}}}

{{#if campaignSummary}}
**Contesto Campagna:**
{{{campaignSummary}}}
{{/if}}

**Istruzioni:**
1. **Titolo**: Crea un nome unico e memorabile.
2. **Sensazioni**: Fornisci descrizioni brevi ma intense per Vista, Udito e Olfatto. Usa un linguaggio evocativo.
3. **Punti di Interesse**: Elenca 2 o 3 elementi con cui i giocatori possono interagire (es. una fontana crepata, un mercante nervoso, una botola nascosta).
4. **Segreto**: Fornisci una nota esclusiva per il Dungeon Master. Deve essere un colpo di scena, un pericolo nascosto o un'informazione vitale che non è evidente a prima vista.

Fornisci l'output in italiano.`
});

const generateLocationFlow = ai.defineFlow(
  {
    name: 'generateLocationFlow',
    inputSchema: GenerateLocationInputSchema,
    outputSchema: GenerateLocationOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
