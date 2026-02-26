import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// AI instance for generating creative content like story sessions.
// This will use the primary API key from the environment variables.
export const storyAi = genkit({
  plugins: [googleAI({apiKey: process.env.GEMINI_API_KEY_STORY})],
  model: 'googleai/gemini-2.5-flash',
});

// AI instance for summarization and analytical tasks.
// This can use a separate API key to manage token usage across different accounts.
export const summaryAi = genkit({
  plugins: [googleAI({apiKey: process.env.GEMINI_API_KEY_SUMMARY})],
  model: 'googleai/gemini-2.5-flash', // You could use a different model if preferred, e.g., one optimized for summarization.
});
