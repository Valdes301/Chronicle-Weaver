'use server';

/**
 * @fileOverview Un flusso potenziato per l'Importazione Intelligente.
 */

import {catalogAi as ai} from '@/ai/genkit';
import {z} from 'genkit';

const MagicItemSchema = z.object({
  name: z.string().describe("Il nome dell'oggetto, TRADOTTO in italiano."),
  type: z.string().optional().describe('Il tipo di oggetto (es. Pozione, Anello, Arma).'),
  rarity: z.string().optional().describe('La rarità (es. Comune, Non comune, Rara).'),
  attunement: z.string().optional().describe('Sintonia (es. "Sì", "No").'),
  description: z.string().optional().describe('Descrizione degli effetti e della storia.'),
  cost: z.string().optional().describe("Il costo suggerito in mo basato sulla rarità se non specificato."),
  damage: z.string().optional().describe("Il dado di danno e il tipo (es. '1d8 tagliente') se applicabile."),
});

const MonsterSchema = z.object({
  name: z.string().describe("Il nome del mostro, TRADOTTO in italiano."),
  type: z.string().optional().describe('Il tipo di creatura (es. Umanoide, Bestia).'),
  armorClass: z.string().optional().describe('Classe Armatura.'),
  hitPoints: z.string().optional().describe('Punti Ferita.'),
  challenge: z.string().optional().describe('Grado di sfida (GS).'),
  description: z.string().optional().describe('Aspetto e abilità.'),
});

const SpellSchema = z.object({
    name: z.string().describe("Il nome dell'incantesimo, TRADOTTO in italiano."),
    level: z.string().optional(),
    school: z.string().optional(),
    casting_time: z.string().optional(),
    range: z.string().optional(),
    components: z.string().optional(),
    duration: z.string().optional(),
    description: z.string().optional(),
    classes: z.string().optional(),
});

const SkillSchema = z.object({
  name: z.string().describe("Il nome dell'abilità, TRADOTTO in italiano."),
  ability: z.string().optional(),
  description: z.string().optional(),
});

const CatalogHandbookInputSchema = z.object({
  content: z.string().optional().describe('Il testo grezzo da catalogare.'),
  photoDataUri: z.string().optional().describe("Una foto del manuale, come URI dati Base64."),
  systemOverride: z.string().optional().describe("Sovrascrittura delle istruzioni di sistema."),
});
export type CatalogHandbookInput = z.infer<typeof CatalogHandbookInputSchema>;

const CatalogHandbookOutputSchema = z.object({
  items: z.array(MagicItemSchema).describe("Oggetti ed equipaggiamento."),
  monsters: z.array(MonsterSchema).describe("Creature e mostri."),
  spells: z.array(SpellSchema).describe("Incantesimi."),
  skills: z.array(SkillSchema).describe("Abilità e capacità."),
});
export type CatalogHandbookOutput = z.infer<typeof CatalogHandbookOutputSchema>;

export async function catalogHandbook(input: CatalogHandbookInput): Promise<CatalogHandbookOutput> {
    return catalogHandbookFlow(input);
}

const prompt = ai.definePrompt({
    name: 'catalogHandbookPrompt',
    input: { schema: CatalogHandbookInputSchema },
    output: { schema: CatalogHandbookOutputSchema },
    prompt: `{{#if systemOverride}}{{{systemOverride}}}{{else}}Sei il Grande Bibliotecario di Candlekeep. Il tuo compito è catalogare i dati di D&D 5e con precisione chirurgica.{{/if}}
Analizza il testo fornito e/o l'immagine del manuale per estrarre ogni singola entità (Oggetto, Mostro, Incantesimo, Abilità).

**REGOLE DI CATALOGAZIONE:**
1. **Traduzione**: TRADUCI sempre i nomi delle entità in italiano (es: "Radiant Malice" diventa "Malizia Radiosa").
2. **Mappatura Tecnica**: Sii estremamente preciso con i campi numerici.
3. **Costi e Valori**: Se non è presente un costo nel testo, stima un valore in monete d'oro (mo) coerente con la rarità dell'oggetto (es: Comune 50-100 mo, Non Comune 100-500 mo, Rara 500-5000 mo).
4. **Danno Separato**: Se un oggetto è un'arma, estrai il danno (es: "1d8 tagliente") nel campo 'damage' e NON includerlo all'inizio della descrizione.
5. **Visione**: Se è presente un'immagine, trascrivi fedelmente i dati, specialmente le tabelle delle statistiche.
6. **Lingua**: L'output deve essere in italiano.

Testo fornito:
'''
{{{content}}}
'''

{{#if photoDataUri}}
Foto del manuale: {{media url=photoDataUri}}
{{/if}}
`,
});

const catalogHandbookFlow = ai.defineFlow(
  {
    name: 'catalogHandbookFlow',
    inputSchema: CatalogHandbookInputSchema,
    outputSchema: CatalogHandbookOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
