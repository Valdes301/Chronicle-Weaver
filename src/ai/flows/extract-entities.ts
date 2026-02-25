'use server';

/**
 * @fileOverview A flow to extract new entities (magic items, monsters) from story text.
 *
 * - extractEntities - A function that handles the entity extraction process.
 * - ExtractEntitiesInput - The input type for the extractEntities function.
 * - ExtractEntitiesOutput - The return type for the extractEntities function.
 */

import {storyAi as ai} from '@/ai/genkit';
import {z} from 'genkit';

const MagicItemSchema = z.object({
  name: z.string().describe('Il nome univoco dell\'oggetto magico.'),
  type: z.string().describe('Il tipo di oggetto (es. Pozione, Anello, Arma).'),
  rarity: z.string().describe('La rarità dell\'oggetto (es. Comune, Non comune, Rara).'),
  attunement: z.string().optional().describe('Indica se l\'oggetto richiede sintonia (es. "Sì", "No", "Sì (da un mago)"). Se non specificato, può essere omesso.'),
  description: z.string().describe('Una descrizione dettagliata degli effetti e della storia dell\'oggetto.'),
});

const MonsterSchema = z.object({
  name: z.string().describe('Il nome univoco del mostro.'),
  type: z.string().describe('Il tipo di creatura (es. Umanoide, Bestia, Non morto).'),
  armorClass: z.string().describe('La Classe Armatura del mostro.'),
  hitPoints: z.string().describe('I punti ferita medi o il dado vita del mostro.'),
  challenge: z.string().describe('Il grado di sfida (GS) del mostro.'),
  description: z.string().describe('Una breve descrizione dell\'aspetto, del comportamento e delle abilità del mostro.'),
});

const ExtractEntitiesInputSchema = z.object({
  storyText: z.string().describe('Il testo di una sessione di D&D da cui estrarre entità.'),
  existingMagicItems: z.array(z.string()).describe('Un elenco di nomi di oggetti magici già noti per evitare duplicati.'),
  existingMonsters: z.array(z.string()).describe('Un elenco di nomi di mostri già noti per evitare duplicati.'),
});

export type ExtractEntitiesInput = z.infer<typeof ExtractEntitiesInputSchema>;

const ExtractEntitiesOutputSchema = z.object({
  newMagicItems: z.array(MagicItemSchema).describe("Un elenco di nuovi oggetti magici menzionati nella storia, con le loro proprietà. Non includere oggetti già presenti in 'existingMagicItems'."),
  newMonsters: z.array(MonsterSchema).describe("Un elenco di nuovi mostri menzionati nella storia, con le loro statistiche. Non includere mostri già presenti in 'existingMonsters'."),
});
export type ExtractEntitiesOutput = z.infer<typeof ExtractEntitiesOutputSchema>;

export async function extractEntities(
  input: ExtractEntitiesInput
): Promise<ExtractEntitiesOutput> {
  return extractEntitiesFlow(input);
}


const prompt = ai.definePrompt({
    name: 'extractEntitiesPrompt',
    input: { schema: ExtractEntitiesInputSchema },
    output: { schema: ExtractEntitiesOutputSchema },
    prompt: `Sei un esperto di Dungeons & Dragons 5e. Analizza il seguente testo di una sessione di D&D e estrai tutti i NUOVI oggetti magici e mostri che vengono introdotti.
Per ogni oggetto magico o mostro, fornisci le sue proprietà come definite nello schema di output.
IGNORA le entità i cui nomi sono già presenti negli elenchi 'existingMagicItems' e 'existingMonsters'.
Se un'entità è menzionata ma non ci sono abbastanza dettagli per riempire le sue proprietà, usa la tua vasta conoscenza di D&D 5e per completare le informazioni in modo plausibile e coerente con il gioco. Se un oggetto sembra chiaramente un oggetto magico, assegnagli una rarità, un tipo e una descrizione appropriati. Se non è chiaro se un oggetto richiede sintonia, puoi impostare il valore su 'No'.
Fornisci l'output in italiano.

Testo della storia:
'''
{{{storyText}}}
'''
---
Elenco di oggetti magici esistenti da ignorare: {{{existingMagicItems}}}
Elenco di mostri esistenti da ignorare: {{{existingMonsters}}}
---
Risultato:
`
});

const extractEntitiesFlow = ai.defineFlow(
  {
    name: 'extractEntitiesFlow',
    inputSchema: ExtractEntitiesInputSchema,
    outputSchema: ExtractEntitiesOutputSchema,
  },
  async (input) => {
    if (!input.storyText.trim()) {
        return { newMagicItems: [], newMonsters: [] };
    }
    const {output} = await prompt(input);
    return output!;
  }
);
