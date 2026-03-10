import { config } from 'dotenv';
config();

import '@/ai/flows/generate-next-session.ts';
import '@/ai/flows/initialize-campaign.ts';
import '@/ai/flows/extract-entities.ts';
import '@/ai/flows/summarize-campaign.ts';
import '@/ai/flows/generate-map.ts';
import '@/ai/flows/import-content.ts';
