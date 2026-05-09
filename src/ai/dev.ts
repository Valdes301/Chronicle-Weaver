import { config } from 'dotenv';
config();

import '@/ai/flows/generate-next-session.ts';
import '@/ai/flows/initialize-campaign.ts';
import '@/ai/flows/extract-entities.ts';
import '@/ai/flows/summarize-campaign.ts';
import '@/ai/flows/summarize-arc-flow.ts';
import '@/ai/flows/generate-map.ts';
import '@/ai/flows/import-content.ts';
import '@/ai/flows/catalog-handbook.ts';
import '@/ai/flows/generate-shop.ts';
import '@/ai/flows/generate-npc.ts';
import '@/ai/flows/generate-location.ts';
import '@/ai/flows/generate-combat.ts';
import '@/ai/flows/generate-treasure.ts';
