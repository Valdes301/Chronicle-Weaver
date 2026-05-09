import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * @fileOverview Configurazione centralizzata delle istanze Genkit.
 * Implementa una gerarchia di chiavi API per garantire la massima resilienza:
 * 1. Chiave specifica per il compito (es. SHOPS)
 * 2. Chiave per compiti analitici (SUMMARY)
 * 3. Chiave master creativa (STORY)
 */

const KEY_STORY = process.env.GEMINI_API_KEY_STORY;
const KEY_SUMMARY = process.env.GEMINI_API_KEY_SUMMARY || KEY_STORY;
const KEY_SHOPS = process.env.GEMINI_API_KEY_SHOPS || KEY_STORY;
const KEY_WORLD = process.env.GEMINI_API_KEY_WORLD || KEY_STORY;
const KEY_EXTRACTION = process.env.GEMINI_API_KEY_EXTRACTION || KEY_SUMMARY || KEY_STORY;
const KEY_IMPORT = process.env.GEMINI_API_KEY_IMPORT || KEY_SUMMARY || KEY_STORY;

// AI instance for generating creative content like story sessions.
export const storyAi = genkit({
  plugins: [googleAI({apiKey: KEY_STORY})],
  model: 'googleai/gemini-2.5-flash',
});

// AI instance for summarization and analytical tasks.
export const summaryAi = genkit({
  plugins: [googleAI({apiKey: KEY_SUMMARY})],
  model: 'googleai/gemini-2.5-flash',
});

// AI instance for shop generation, item creation and treasures.
export const shopAi = genkit({
  plugins: [googleAI({apiKey: KEY_SHOPS})],
  model: 'googleai/gemini-2.5-flash',
});

// AI instance for world and location generation and NPC management.
export const worldAi = genkit({
  plugins: [googleAI({apiKey: KEY_WORLD})],
  model: 'googleai/gemini-2.5-flash',
});

// AI instance for automatic entity extraction from story text.
export const extractionAi = genkit({
  plugins: [googleAI({apiKey: KEY_EXTRACTION})],
  model: 'googleai/gemini-2.5-flash',
});

// AI instance for handbook cataloging and intelligent data extraction.
export const catalogAi = genkit({
  plugins: [googleAI({apiKey: KEY_IMPORT})],
  model: 'googleai/gemini-2.5-flash',
});
