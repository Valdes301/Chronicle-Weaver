'use server';

/**
 * @fileOverview A flow to generate the outline of the next D&D session based on the campaign history.
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
      'Un riassunto dettagliate delle sessioni più recenti per fornire un contesto immediato.'
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
  homebrewRules: z
    .string()
    .optional()
    .describe('Regole personalizzate (Homebrew) da rispettare rigorosamente.'),
  systemOverride: z
    .string()
    .optional()
    .describe('Sovrascrittura delle istruzioni di sistema.'),
});
export type GenerateNextSessionInput = z.infer<typeof GenerateNextSessionInputSchema>;

const GenerateNextSessionOutputSchema = z.object({
  sessionOutline: z
    .string()
    .describe('Un profilo dettagliate della prossima sessione di D&D, inclusi eventi chiave, incontri e decisioni.'),
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
  prompt: `{{#if systemOverride}}{{{systemOverride}}}{{else}}Sei un Dungeon Master esperto per Dungeons & Dragons 5e. Devi scrivere bozze di sessioni epiche calcolando gli XP. È MANDATORIO usare i dati delle schede dei PG (Ideali, Legami, Difetti, Abilità e Magie) per creare ganci narrativi personalizzati. L'output deve essere una narrazione fluida e coinvolgente in italiano.{{/if}}

---
**DATI PERSONAGGI (ANALISI OBBLIGATORIA):**
Usa queste informazioni per rendere la storia PERSONALE per i giocatori:
'''
{{{playerCharacters}}}
'''

**REGOLE DI INTEGRAZIONE PG:**
1. **Dilemmi Morali**: Se un PG ha un 'Ideale', crea situazioni che lo mettano alla prova.
2. **Passato e Legami**: Usa i 'Legami' per introdurre PNG o luoghi che abbiano un significato emotivo.
3. **Difetti**: Sfrutta i 'Difetti' per tentazioni o complicazioni narrative.
4. **Capacità**: Inserisci ostacoli superabili grazie a specifiche 'Abilità' o 'Magie' possedute dai PG.

---
**Contesto della Campagna:**
*   **Nome:** {{{campaignName}}}
*   **Ambientazione:** {{{campaignSetting}}}

{{#if homebrewRules}}
**REGOLE DELLA CASA (HOMEBREW) DA RISPETTARE:**
{{{homebrewRules}}}
{{/if}}

{{#if campaignSummary}}
**Riassunto Generale (Contesto a Lungo Termine):**
{{{campaignSummary}}}
{{/if}}

**Eventi Recenti (Contesto Immediato):**
{{{recentSessionsSummary}}}

---
**Istruzioni per la Scena:**

{{#if modificationRequest}}
**Bozza Precedente:**
\`\`\`
{{{storyToModify}}}
\`\`\`
**Richiesta di Modifica:** "{{{modificationRequest}}}"
Applica le modifiche mantenendo la coerenza con i dati dei PG sopra forniti.
{{else}}
**Prompt del Master:** "{{{customPrompt}}}"
Crea una scena basata su questo prompt, intrecciandolo con le storie e le personalità dei PG.
{{/if}}

**Output (Narrazione e XP):**
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
