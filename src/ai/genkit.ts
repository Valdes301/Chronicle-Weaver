import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// AI instance for generating creative content like story sessions.
export const storyAi = genkit({
  plugins: [googleAI({apiKey: process.env.GEMINI_API_KEY_STORY})],
  model: 'googleai/gemini-2.5-flash',
});

// AI instance for summarization and analytical tasks.
export const summaryAi = genkit({
  plugins: [googleAI({apiKey: process.env.GEMINI_API_KEY_SUMMARY})],
  model: 'googleai/gemini-2.5-flash',
});

// AI instance for shop generation and item creation.
export const shopAi = genkit({
  plugins: [googleAI({apiKey: process.env.GEMINI_API_KEY_SHOPS || process.env.GEMINI_API_KEY_STORY})],
  model: 'googleai/gemini-2.5-flash',
});

// AI instance for world and location generation.
export const worldAi = genkit({
  plugins: [googleAI({apiKey: process.env.GEMINI_API_KEY_WORLD || process.env.GEMINI_API_KEY_STORY})],
  model: 'googleai/gemini-2.5-flash',
});

// AI instance for handbook cataloging and intelligent data extraction.
export const catalogAi = genkit({
  plugins: [googleAI({apiKey: process.env.GEMINI_API_KEY_IMPORT || process.env.GEMINI_API_KEY_SUMMARY || process.env.GEMINI_API_KEY_STORY})],
  model: 'googleai/gemini-2.5-flash',
});
