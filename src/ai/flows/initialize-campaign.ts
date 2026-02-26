
'use server';

/**
 * @fileOverview Initializes a new D&D 5e campaign with GenAI-generated starting ideas.
 *
 * - initializeCampaign - A function that initializes a new campaign.
 * - CampaignInput - The input type for the initializeCampaign function.
 * - CampaignOutput - The return type for the initializeCampaign function.
 */

import {storyAi as ai} from '@/ai/genkit';
import {z} from 'genkit';

const CampaignInputSchema = z.object({
  campaignName: z.string().describe('The name of the D&D 5e campaign.'),
  setting: z.string().describe('The setting of the D&D 5e campaign (e.g., Forgotten Realms, Eberron).'),
  description: z.string().optional().describe('A brief description of the campaign.'),
});
export type CampaignInput = z.infer<typeof CampaignInputSchema>;

const CampaignOutputSchema = z.object({
  initial_summary: z.string().describe('Un testo che descrive idee iniziali per luoghi, PNG e spunti di trama per la campagna. Questo testo verrà usato come primo sommario.'),
  progress: z.string().describe('Un riassunto di una frase di ciò che è stato generato.'),
});
export type CampaignOutput = z.infer<typeof CampaignOutputSchema>;

export async function initializeCampaign(input: CampaignInput): Promise<CampaignOutput> {
  return initializeCampaignFlow(input);
}

const campaignPrompt = ai.definePrompt({
  name: 'campaignPrompt',
  input: {schema: CampaignInputSchema},
  output: {schema: CampaignOutputSchema},
  prompt: `Sei un Dungeon Master creativo per D&D 5e.

  Genera un testo introduttivo per una nuova campagna basata sulle seguenti informazioni, in italiano. Questo testo servirà come primo "sommario" della campagna.

  Nome Campagna: {{{campaignName}}}
  Ambientazione: {{{setting}}}
  {{#if description}}Descrizione: {{{description}}}{{/if}}

  Nel testo, includi idee per:
  - Luoghi: Descrivi 1-2 luoghi interessanti e unici che i giocatori possono visitare.
  - PNG: Descrivi 1-2 personaggi non giocanti memorabili con cui i giocatori possono interagire, suggerendo il loro ruolo.
  - Spunti di trama: Offri un paio di spunti o misteri iniziali per dare il via all'avventura.
  
  Struttura il testo in modo narrativo e coinvolgente.
  Infine, nel campo 'progress', fornisci un riassunto di una frase di ciò che hai generato.
  `,
});

const initializeCampaignFlow = ai.defineFlow(
  {
    name: 'initializeCampaignFlow',
    inputSchema: CampaignInputSchema,
    outputSchema: CampaignOutputSchema,
  },
  async input => {
    const {output} = await campaignPrompt(input);
    return output!;
  }
);
