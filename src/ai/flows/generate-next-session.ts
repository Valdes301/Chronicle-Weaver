'use server';

/**
 * @fileOverview A flow to generate the outline of the next D&D session based on the campaign history.
 *
 * - generateNextSession - A function that generates the next session outline.
 * - GenerateNextSessionInput - The input type for the generateNextSession function.
 * - GenerateNextSessionOutput - The return type for the generateNextSession function.
 */

import {storyAi as ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateNextSessionInputSchema = z.object({
  campaignName: z.string().describe('Il nome della campagna D&D.'),
  campaignSetting: z.string().describe("L'ambientazione della campagna D&D."),
  campaignSummary: z
    .string()
    .optional()
    .describe(
      "Un riassunto generale dell'intera campagna, che fornisce il contesto a lungo termine."
    ),
  recentSessionsSummary: z
    .string()
    .describe(
      'Un riassunto dettagliato delle sessioni più recenti per fornire un contesto immediato.'
    ),
  playerCharacters: z
    .string()
    .describe('Una stringa JSON che rappresenta un array di oggetti personaggio. Ogni oggetto contiene dettagli come nome, classe, statistiche, abilità, magie, background e tratti di personalità (tratti, ideali, legami, difetti).'),
  customPrompt: z
    .string()
    .describe("Un prompt personalizzato fornito dall'utente per guidare la generazione della sessione."),
  storyToModify: z
    .string()
    .optional()
    .describe('La bozza di storia precedente che necessita di modifiche.'),
  modificationRequest: z
    .string()
    .optional()
    .describe('Le istruzioni specifiche per modificare la bozza di storia precedente.'),
});
export type GenerateNextSessionInput = z.infer<typeof GenerateNextSessionInputSchema>;

const GenerateNextSessionOutputSchema = z.object({
  sessionOutline: z
    .string()
    .describe('Un profilo dettagliato della prossima sessione di D&D, inclusi eventi chiave, incontri e decisioni.'),
  xpAward: z
    .number()
    .describe("Una stima dei punti esperienza (XP) totali che il party dovrebbe guadagnare per aver completato gli eventi di questa sessione. Basati sugli incontri, le sfide e il raggiungimento degli obiettivi descritti."),
});
export type GenerateNextSessionOutput = z.infer<typeof GenerateNextSessionOutputSchema>;

export async function generateNextSession(
  input: GenerateNextSessionInput
): Promise<GenerateNextSessionOutput> {
  return generateNextSessionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateNextSessionPrompt',
  input: {schema: GenerateNextSessionInputSchema},
  output: {schema: GenerateNextSessionOutputSchema},
  prompt: `Sei un Dungeon Master esperto per Dungeons & Dragons 5e. Il tuo compito è scrivere una bozza dettagliata per la prossima sessione di gioco e calcolare i punti esperienza (XP) appropriati. L'output deve essere una narrazione fluida e coinvolgente in italiano.

**Contesto della Campagna:**
*   **Nome:** {{{campaignName}}}
*   **Ambientazione:** {{{campaignSetting}}}
*   **Personaggi Giocanti:** Utilizza le informazioni dettagliate fornite nell'oggetto JSON 'playerCharacters'. Presta particolare attenzione ai loro tratti di personalità (Tratti, Ideali, Legami, Difetti), abilità e background per creare scene e dilemmi personalizzati.
{{{playerCharacters}}}

{{#if campaignSummary}}
**Riassunto Generale della Campagna (Contesto a Lungo Termine):**
{{{campaignSummary}}}
---
{{/if}}

**Eventi Recenti (Contesto Immediato):**
{{{recentSessionsSummary}}}

---

**Istruzioni per la Scena Attuale:**

{{#if modificationRequest}}
**Bozza Precedente da Modificare:**
\`\`\`
{{{storyToModify}}}
\`\`\`
**Richiesta di Modifica:** "{{{modificationRequest}}}"
Basandoti sulla bozza precedente, applica le modifiche richieste in modo creativo.
{{else}}
**Prompt Iniziale:** "{{{customPrompt}}}"
Usa questo prompt per creare una nuova scena. Descrivi l'ambiente, gli eventi chiave, gli incontri (PNG, mostri) e le decisioni importanti per i giocatori. Sfrutta le informazioni sui personaggi per rendere la scena più impattante per loro.
{{/if}}

---
**Calcolo Punti Esperienza (XP):**
Dopo aver scritto la narrazione della scena, analizza gli eventi, gli incontri con mostri e il superamento delle sfide descritte. Calcola un ammontare totale di Punti Esperienza (XP) da assegnare al party per il completamento di questa sessione e inserisci il valore numerico nel campo 'xpAward'.

**Output (narrazione e XP):**
`,
});


const generateNextSessionFlow = ai.defineFlow(
  {
    name: 'generateNextSessionFlow',
    inputSchema: GenerateNextSessionInputSchema,
    outputSchema: GenerateNextSessionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
