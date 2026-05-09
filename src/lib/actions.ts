'use server';

import db from '@/lib/db';
import { initializeCampaign as initializeCampaignFlow } from '@/ai/flows/initialize-campaign';
import { extractEntities as extractEntitiesFlow } from '@/ai/flows/extract-entities';
import { generateNextSession as generateNextSessionFlow } from '@/ai/flows/generate-next-session';
import { summarizeCampaign as summarizeCampaignFlow } from '@/ai/flows/summarize-campaign';
import { summarizeArc as summarizeArcFlow } from '@/ai/flows/summarize-arc-flow';
import { generateMap as generateMapFlow } from '@/ai/flows/generate-map';
import { importContent as importContentFlow } from '@/ai/flows/import-content';
import { catalogHandbook as catalogHandbookFlow } from '@/ai/flows/catalog-handbook';
import { generateShop as generateShopFlow } from '@/ai/flows/generate-shop';
import { generateLocation as generateLocationFlow } from '@/ai/flows/generate-location';
import { generateNpc as generateNpcFlow } from '@/ai/flows/generate-npc';
import { generateCombat as generateCombatFlow } from '@/ai/flows/generate-combat';
import { generateTreasure as generateTreasureFlow } from '@/ai/flows/generate-treasure';
import type { Session, CampaignWithRelations, Campaign, MagicItem, Monster, PlayerCharacter, Spell, Skill, LetterPreset, Shop, ShopItem, WorldLocation, LocationDetails, Npc, NpcDetails, Combat, CombatDetails, GenerateCombatInput, GenerateNpcInput, GenerateShopInput, GenerateLocationInput, Reward, GenerateTreasureInput, CharacterEvent, StoryArc } from '@/lib/types';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

// --- UTILITY: GESTIONE ERRORI E RETRY ---

/**
 * Esegue una chiamata AI con logica di Exponential Backoff per gestire limiti di quota (429).
 */
async function runAiWithRetry<T>(aiCall: () => Promise<T>, maxRetries = 5): Promise<T> {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await aiCall();
        } catch (error: any) {
            lastError = error;
            const errorStr = String(error).toLowerCase();
            
            const isRetryable = 
                errorStr.includes('429') ||
                errorStr.includes('503') || 
                errorStr.includes('high demand') || 
                errorStr.includes('too many requests') ||
                errorStr.includes('quota exceeded') ||
                errorStr.includes('fetch failed') ||
                errorStr.includes('deadline exceeded');

            if (isRetryable && i < maxRetries - 1) {
                const waitTime = Math.pow(2, i + 1) * 1000 + (Math.random() * 1000);
                console.warn(`[AI Retry] Limite Quota. Tentativo ${i + 1}/${maxRetries} tra ${Math.round(waitTime)}ms...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }
            throw error;
        }
    }
    throw lastError;
}

const actionResponse = <T>(data: T | null, error?: string) => {
    if (error) {
        let userFriendlyError = error;
        if (error.includes('429')) userFriendlyError = "Limite di richieste raggiunto. L'IA sta riposando, riprova tra un minuto.";
        if (error.includes('503')) userFriendlyError = "Il server dell'IA è sovraccarico. Attendi un istante.";
        return { success: false, data: null, error: userFriendlyError };
    }
    return { success: true, data, error: null };
}

// --- AZIONI BIBLIOTECA E ARCHI NARRATIVI ---

export async function getStoryArcs(campaignId: string) {
    try {
        const arcs = db.prepare("SELECT * FROM StoryArc WHERE campaignId = ? ORDER BY order_index ASC, createdAt ASC").all(campaignId) as StoryArc[];
        return actionResponse(arcs);
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function updateStoryArc(arcId: string, title: string, summary: string, worldImpact: string) {
    try {
        db.prepare("UPDATE StoryArc SET title = ?, summary = ?, world_impact = ?, updatedAt = ? WHERE id = ?")
          .run(title, summary, worldImpact, new Date().toISOString(), arcId);
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

/**
 * Genera o aggiorna la sintesi di un Arco in modo incrementale usando solo le storie selezionate.
 */
export async function generateArcSummaryAction(arcId: string, sessionIds: string[]) {
    try {
        if (!sessionIds || sessionIds.length === 0) throw new Error("Seleziona almeno una storia.");

        const arc = db.prepare("SELECT * FROM StoryArc WHERE id = ?").get(arcId) as StoryArc;
        if (!arc) throw new Error("Arco non trovato.");

        const placeholders = sessionIds.map(() => '?').join(',');
        const sessions = db.prepare(`SELECT id, session_number, title, notes FROM Session WHERE id IN (${placeholders}) ORDER BY session_number ASC, createdAt ASC`).all(...sessionIds) as { id: string, session_number: number, title: string, notes: string }[];

        const campaign = db.prepare("SELECT global_compendium FROM Campaign WHERE id = ?").get(arc.campaignId) as { global_compendium: string };

        const aiSummary = await runAiWithRetry(() => summarizeArcFlow({
            arcTitle: arc.title,
            existingSummary: arc.summary || undefined,
            sessions: sessions.map(s => ({ 
              sessionNumber: s.session_number,
              title: s.title, 
              notes: s.notes || '' 
            })),
            campaignContext: campaign.global_compendium || undefined
        }));

        db.transaction(() => {
            const now = new Date().toISOString();
            db.prepare("UPDATE StoryArc SET title = ?, summary = ?, world_impact = ?, updatedAt = ? WHERE id = ?").run(aiSummary.newTitle, aiSummary.summary, aiSummary.worldImpact, now, arcId);

            const updateSessionStmt = db.prepare("UPDATE Session SET is_summarized = 1, updatedAt = ? WHERE id = ?");
            for (const s of sessions) {
                updateSessionStmt.run(now, s.id);
            }

            // Sincronizza con la memoria attiva della Dashboard se l'arco è quello corrente
            if (arc.status === 'active') {
                db.prepare("UPDATE Campaign SET summary = ?, updatedAt = ? WHERE id = ?").run(aiSummary.summary, now, arc.campaignId);
            }

            // Aggiorna la memoria storica globale della campagna
            const allArchivedSummaries = db.prepare("SELECT title, summary, world_impact FROM StoryArc WHERE campaignId = ? AND status = 'archived' AND summary IS NOT NULL ORDER BY order_index ASC").all(arc.campaignId) as any[];
            const newCompendium = allArchivedSummaries.map(a => `### ${a.title}\n${a.summary}\n\n**Impatto:**\n${a.world_impact}`).join('\n\n---\n\n');
            db.prepare("UPDATE Campaign SET global_compendium = ?, updatedAt = ? WHERE id = ?").run(newCompendium || null, now, arc.campaignId);
        })();

        return actionResponse({ success: true });
    } catch (error: any) {
        return actionResponse(null, error.message);
    }
}

/**
 * Rimuove un Arco. Se è archiviato lo cancella, se è attivo ne resetta la memoria.
 */
export async function deleteStoryArc(arcId: string) {
    try {
        const arc = db.prepare("SELECT * FROM StoryArc WHERE id = ?").get(arcId) as StoryArc;
        if (!arc) throw new Error("Arco non trovato.");
        
        const campaignId = arc.campaignId;
        const now = new Date().toISOString();

        db.transaction(() => {
            if (arc.status === 'active') {
                // RESET MEMORIA ATTIVA
                db.prepare("UPDATE StoryArc SET summary = NULL, world_impact = NULL, updatedAt = ? WHERE id = ?").run(now, arcId);
                db.prepare("UPDATE Session SET is_summarized = 0, updatedAt = ? WHERE arcId = ?").run(now, arcId);
                db.prepare("UPDATE Campaign SET summary = NULL, updatedAt = ? WHERE id = ?").run(now, campaignId);
            } else {
                // ELIMINAZIONE ARCHIVIO E RIPRISTINO STORIE
                const activeArc = db.prepare("SELECT id FROM StoryArc WHERE campaignId = ? AND status = 'active'").get(campaignId) as { id: string };
                if (activeArc) {
                    db.prepare("UPDATE Session SET arcId = ?, is_archived = 0, is_summarized = 0, updatedAt = ? WHERE arcId = ?").run(activeArc.id, now, arcId);
                }
                db.prepare("DELETE FROM StoryArc WHERE id = ?").run(arcId);
            }

            // RICALCOLO COMPENDIO GLOBALE
            const allRemaining = db.prepare("SELECT title, summary, world_impact FROM StoryArc WHERE campaignId = ? AND status = 'archived' AND summary IS NOT NULL ORDER BY order_index ASC").all(campaignId) as any[];
            const newCompendium = allRemaining.length > 0 
                ? allRemaining.map(a => `### ${a.title}\n${a.summary}\n\n**Impatto:**\n${a.world_impact}`).join('\n\n---\n\n')
                : null;
            
            db.prepare("UPDATE Campaign SET global_compendium = ?, updatedAt = ? WHERE id = ?").run(newCompendium, now, campaignId);
        })();
        return actionResponse({ success: true });
    } catch (error: any) {
        return actionResponse(null, error.message);
    }
}

export async function getArchiveSessions(arcId: string) {
    try {
        const sessions = db.prepare("SELECT * FROM Session WHERE arcId = ? ORDER BY session_number ASC, createdAt ASC").all(arcId) as Session[];
        return actionResponse(sessions);
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

// --- AZIONI CAMPAGNA E DASHBOARD ---

export async function createCampaign(data: { name: string; setting: string; description?: string | null; }) {
    try {
        const campaignId = randomUUID();
        const arcId = randomUUID();
        const now = new Date().toISOString();

        const aiResult = await runAiWithRetry(() => initializeCampaignFlow({
            campaignName: data.name,
            setting: data.setting,
            description: data.description || undefined,
        }));

        db.transaction(() => {
            db.prepare(`INSERT INTO Campaign (id, name, setting, description, summary, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
                campaignId, data.name, data.setting, data.description || null, aiResult.initial_summary, now, now
            );
            db.prepare(`INSERT INTO StoryArc (id, campaignId, title, status, order_index, createdAt, updatedAt) VALUES (?, ?, 'Atto Iniziale', 'active', 0, ?, ?)`).run(
                arcId, campaignId, now, now
            );
        })();

        return actionResponse({ campaign: { id: campaignId }, progress: aiResult.progress });
    } catch (error: any) {
        return actionResponse(null, error.message);
    }
}

export async function updateActiveArcInfo(campaignId: string, arcId: string, title: string, label: string) {
    try {
        db.transaction(() => {
            db.prepare("UPDATE StoryArc SET title = ?, updatedAt = ? WHERE id = ?").run(title, new Date().toISOString(), arcId);
            db.prepare("UPDATE Campaign SET active_arc_label = ?, updatedAt = ? WHERE id = ?").run(label, new Date().toISOString(), campaignId);
        })();
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

/**
 * Archivia l'atto corrente e ne inizia uno nuovo, resettando la memoria attiva.
 */
export async function archiveActiveArc(campaignId: string, arcId: string) {
    try {
        const now = new Date().toISOString();
        const newArcId = randomUUID();
        const campaign = db.prepare("SELECT summary FROM Campaign WHERE id = ?").get(campaignId) as { summary: string | null };

        db.transaction(() => {
            db.prepare("UPDATE StoryArc SET status = 'archived', summary = ?, updatedAt = ? WHERE id = ?").run(campaign.summary, now, arcId);
            db.prepare("UPDATE Session SET is_archived = 1, updatedAt = ? WHERE arcId = ?").run(now, arcId);
            db.prepare("UPDATE Campaign SET summary = NULL, updatedAt = ? WHERE id = ?").run(now, campaignId);
            db.prepare(`INSERT INTO StoryArc (id, campaignId, title, status, order_index, createdAt, updatedAt) VALUES (?, ?, 'Nuovo Capitolo', 'active', 1, ?, ?)`).run(
                newArcId, campaignId, now, now
            );
            
            const allArchived = db.prepare("SELECT title, summary, world_impact FROM StoryArc WHERE campaignId = ? AND status = 'archived' AND summary IS NOT NULL ORDER BY order_index ASC").all(campaignId) as any[];
            const newCompendium = allArchived.length > 0 
                ? allArchived.map(a => `### ${a.title}\n${a.summary}\n\n**Impatto:**\n${a.world_impact || 'Nessuna nota.'}`).join('\n\n---\n\n')
                : null;
            db.prepare("UPDATE Campaign SET global_compendium = ? WHERE id = ?").run(newCompendium, campaignId);
        })();
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function archiveSingleSession(sessionId: string) {
    try {
        db.prepare("UPDATE Session SET is_archived = 1, updatedAt = ? WHERE id = ?").run(new Date().toISOString(), sessionId);
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

// --- AZIONI SESSIONI ---

export async function generateNextSession(campaign: CampaignWithRelations, recentSessions: Session[], prompt: string, modification?: { storyToModify: string, request: string }) {
    try {
        const playerCharactersJson = JSON.stringify(campaign.playerCharacters || []);
        const recentSummary = recentSessions.slice(-3).map(s => `Sess ${s.session_number}: ${s.title}\n${s.notes}`).join('\n---\n');

        const result = await runAiWithRetry(() => generateNextSessionFlow({
            campaignName: campaign.name,
            campaignSetting: campaign.setting,
            campaignSummary: campaign.summary || undefined,
            recentSessionsSummary: recentSummary || "Inizio campagna.",
            playerCharacters: playerCharactersJson,
            customPrompt: prompt,
            storyToModify: modification?.storyToModify,
            modificationRequest: modification?.request,
        }));

        return actionResponse(result);
    } catch (error: any) {
        return actionResponse(null, error.message);
    }
}

export async function confirmSession(sessionData: any, campaignId: string) {
    try {
        const activeArc = db.prepare("SELECT id FROM StoryArc WHERE campaignId = ? AND status = 'active'").get(campaignId) as { id: string };
        const id = randomUUID();
        const now = new Date().toISOString();

        db.prepare(`INSERT INTO Session (id, session_number, title, notes, xp_award, source, campaignId, arcId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
            id, sessionData.session_number, sessionData.title, sessionData.notes, sessionData.xp_award, sessionData.source, campaignId, activeArc.id, now, now
        );
        return actionResponse({ id });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function importSession(notes: string, title: string, campaignId: string, sessionNumber: number) {
    try {
        const activeArc = db.prepare("SELECT id FROM StoryArc WHERE campaignId = ? AND status = 'active'").get(campaignId) as { id: string };
        const id = randomUUID();
        const now = new Date().toISOString();

        db.prepare(`INSERT INTO Session (id, session_number, title, notes, source, campaignId, arcId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
            id, sessionNumber, title || `Sessione ${sessionNumber}`, notes, 'imported', campaignId, activeArc.id, now, now
        );
        return actionResponse({ id });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function updateSessionMetadata(sessionId: string, title: string, num: number) {
    try {
        db.prepare("UPDATE Session SET title = ?, session_number = ?, updatedAt = ? WHERE id = ?").run(title, num, new Date().toISOString(), sessionId);
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function updateSessionTitle(sessionId: string, title: string) {
    try {
        db.prepare("UPDATE Session SET title = ?, updatedAt = ? WHERE id = ?").run(title, new Date().toISOString(), sessionId);
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function updateSessionNumber(sessionId: string, num: number) {
    try {
        db.prepare("UPDATE Session SET session_number = ?, updatedAt = ? WHERE id = ?").run(num, new Date().toISOString(), sessionId);
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function updateSessionNotes(sessionId: string, notes: string) {
    try {
        db.prepare("UPDATE Session SET notes = ?, updatedAt = ? WHERE id = ?").run(notes, new Date().toISOString(), sessionId);
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function updateSessionXp(sessionId: string, xp: number) {
    try {
        db.prepare("UPDATE Session SET xp_award = ?, updatedAt = ? WHERE id = ?").run(xp, new Date().toISOString(), sessionId);
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function toggleSessionReadStatus(sessionId: string) {
    try {
        db.prepare("UPDATE Session SET is_read = NOT is_read, updatedAt = ? WHERE id = ?").run(new Date().toISOString(), sessionId);
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function deleteSession(sessionId: string) {
    try {
        db.prepare("DELETE FROM Session WHERE id = ?").run(sessionId);
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function reorderSessions(orderedIds: string[]) {
    try {
        const placeholders = orderedIds.map(() => '?').join(',');
        const sessions = db.prepare(`SELECT id, session_number FROM Session WHERE id IN (${placeholders})`).all(...orderedIds) as { id: string, session_number: number }[];
        const sortedNumbers = sessions.map(s => s.session_number).sort((a, b) => a - b);
        
        db.transaction(() => {
            const now = new Date().toISOString();
            const updateStmt = db.prepare("UPDATE Session SET session_number = ?, updatedAt = ? WHERE id = ?");
            orderedIds.forEach((id, idx) => updateStmt.run(sortedNumbers[idx], now, id));
        })();
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function resyncSessionNumbers(campaignId: string) {
    try {
        const sessions = db.prepare("SELECT id FROM Session WHERE campaignId = ? ORDER BY session_number ASC, createdAt ASC").all(campaignId) as { id: string }[];
        db.transaction(() => {
            const updateStmt = db.prepare("UPDATE Session SET session_number = ? WHERE id = ?");
            sessions.forEach((s, idx) => updateStmt.run(idx + 1, s.id));
        })();
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

// --- AZIONI ENTITÀ E BOTTINO ---

export async function scanSessionForLoot(sessionId: string) {
    try {
        const session = db.prepare("SELECT * FROM Session WHERE id = ?").get(sessionId) as Session;
        if (!session || !session.notes) throw new Error("Sessione non trovata.");

        const knownCharacters = [...(db.prepare("SELECT name FROM PlayerCharacter WHERE campaignId = ?").all(session.campaignId) as any[]).map(c => c.name), ...(db.prepare("SELECT name FROM Npc WHERE campaignId = ?").all(session.campaignId) as any[]).map(n => n.name)];

        const entities = await runAiWithRetry(() => extractEntitiesFlow({ storyText: session.notes!, existingCharacters: knownCharacters }));

        db.transaction(() => {
            const now = new Date().toISOString();
            for (const item of entities.newMagicItems) {
                db.prepare(`INSERT OR IGNORE INTO MagicItem (id, name, type, rarity, attunement, description, cost, damage, campaignId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(randomUUID(), item.name, item.type, item.rarity, item.attunement || 'No', item.description, item.cost || 'N/D', item.damage || '', session.campaignId);
                const actual = db.prepare("SELECT id FROM MagicItem WHERE name = ? AND campaignId = ?").get(item.name, session.campaignId) as { id: string };
                db.prepare(`INSERT OR IGNORE INTO SessionLoot (sessionId, entityId, entityType) VALUES (?, ?, 'item')`).run(sessionId, actual.id);
            }
            for (const m of entities.newMonsters) {
                db.prepare(`INSERT OR IGNORE INTO Monster (id, name, type, armorClass, hitPoints, challenge, description, campaignId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(randomUUID(), m.name, m.type, m.armorClass, m.hitPoints, m.challenge, m.description, session.campaignId);
                const actual = db.prepare("SELECT id FROM Monster WHERE name = ? AND campaignId = ?").get(m.name, session.campaignId) as { id: string };
                db.prepare(`INSERT OR IGNORE INTO SessionLoot (sessionId, entityId, entityType) VALUES (?, ?, 'monster')`).run(sessionId, actual.id);
            }
            for (const r of entities.rewards) {
                db.prepare(`INSERT INTO Reward (id, campaignId, sessionId, name, description) VALUES (?, ?, ?, ?, ?)`).run(randomUUID(), session.campaignId, sessionId, r.name, r.description);
            }
            for (const event of entities.characterEvents) {
                const pc = db.prepare("SELECT id FROM PlayerCharacter WHERE name = ? AND campaignId = ?").get(event.name, session.campaignId) as { id: string };
                let charId = pc?.id;
                let charType: 'pc' | 'npc' = 'pc';
                if (!charId) {
                    const npc = db.prepare("SELECT id FROM Npc WHERE name = ? AND campaignId = ?").get(event.name, session.campaignId) as { id: string };
                    charId = npc?.id;
                    charType = 'npc';
                    if (!charId && event.isNew) {
                        charId = randomUUID();
                        const d: NpcDetails = { name: event.name, race: 'Sconosciuta', occupation: 'Rilevato', appearance: 'In analisi...', personality: '...', mannerism: '...', secret: '...', encounterHook: event.event };
                        db.prepare(`INSERT INTO Npc (id, campaignId, name, race, details, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`).run(charId, session.campaignId, event.name, 'Sconosciuta', JSON.stringify(d), now);
                    }
                }
                if (charId) db.prepare(`INSERT INTO CharacterEvent (id, characterId, characterType, sessionId, campaignId, eventDescription, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(randomUUID(), charId, charType, sessionId, session.campaignId, event.event, now);
            }
            db.prepare("UPDATE Session SET loot_scanned = 1, updatedAt = ? WHERE id = ?").run(now, sessionId);
        })();
        return actionResponse({ success: true });
    } catch (error: any) {
        return actionResponse(null, error.message);
    }
}

export async function getSessionLoot(sessionId: string) {
    try {
        const items = db.prepare(`SELECT m.* FROM MagicItem m JOIN SessionLoot l ON m.id = l.entityId WHERE l.sessionId = ? AND l.entityType = 'item'`).all(sessionId) as MagicItem[];
        const monsters = db.prepare(`SELECT m.* FROM Monster m JOIN SessionLoot l ON m.id = l.entityId WHERE l.sessionId = ? AND l.entityType = 'monster'`).all(sessionId) as Monster[];
        const rewards = db.prepare("SELECT * FROM Reward WHERE sessionId = ?").all(sessionId) as Reward[];
        const characterEvents = db.prepare(`SELECT e.*, CASE WHEN e.characterType = 'pc' THEN p.name ELSE n.name END as characterName, e.characterType FROM CharacterEvent e LEFT JOIN PlayerCharacter p ON e.characterId = p.id AND e.characterType = 'pc' LEFT JOIN Npc n ON e.characterId = n.id AND e.characterType = 'npc' WHERE e.sessionId = ?`).all(sessionId) as any[];
        return actionResponse({ items, monsters, rewards, characterEvents });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function clearSessionLoot(sessionId: string) {
    try {
        db.transaction(() => {
            db.prepare("DELETE FROM SessionLoot WHERE sessionId = ?").run(sessionId);
            db.prepare("DELETE FROM Reward WHERE sessionId = ?").run(sessionId);
            db.prepare("DELETE FROM CharacterEvent WHERE sessionId = ?").run(sessionId);
            db.prepare("UPDATE Session SET loot_scanned = 0 WHERE id = ?").run(sessionId);
        })();
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

// --- AZIONI MEMORIA E SOMMARIO ---

export async function summarizeCampaign(campaignId: string) {
    try {
        const sessions = db.prepare("SELECT session_number, title, notes FROM Session WHERE campaignId = ? ORDER BY session_number ASC").all(campaignId) as any[];
        const history = sessions.map(s => `Sessione ${s.session_number}: ${s.title}\n${s.notes}`).join('\n\n');
        const result = await runAiWithRetry(() => summarizeCampaignFlow({ campaignHistory: history }));
        db.prepare("UPDATE Campaign SET summary = ?, updatedAt = ? WHERE id = ?").run(result.summary, new Date().toISOString(), campaignId);
        return actionResponse({ success: true });
    } catch (error: any) {
        return actionResponse(null, error.message);
    }
}

// --- AZIONI GENERATORI E IMPORT ---

export async function generateMapAction(prompt: string) {
    try {
        const svgString = await runAiWithRetry(() => generateMapFlow(prompt));
        return actionResponse({ svgString });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function analyzeContentAction(content: string) {
    try {
        const data = await runAiWithRetry(() => importContentFlow({ fileContent: content }));
        return actionResponse(data);
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function catalogHandbookAction(content: string, photoDataUri?: string) {
    try {
        const data = await runAiWithRetry(() => catalogHandbookFlow({ content, photoDataUri }));
        return actionResponse(data);
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function bulkImportAction(campaignId: string, data: any) {
    try {
        let count = 0;
        db.transaction(() => {
            if (data.items) {
                const s = db.prepare(`INSERT OR IGNORE INTO MagicItem (id, campaignId, name, type, rarity, attunement, description, cost, damage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
                for (const it of data.items) { s.run(randomUUID(), campaignId, it.name, it.type || 'Oggetto', it.rarity || 'Comune', it.attunement || 'No', it.description || '', it.cost || 'N/D', it.damage || ''); count++; }
            }
            if (data.monsters) {
                const s = db.prepare(`INSERT OR IGNORE INTO Monster (id, campaignId, name, type, armorClass, hitPoints, challenge, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
                for (const m of data.monsters) { s.run(randomUUID(), campaignId, m.name, m.type || 'Mostro', m.armorClass || '10', m.hitPoints || '10', m.challenge || '0', m.description || ''); count++; }
            }
            if (data.spells) {
                const s = db.prepare(`INSERT OR IGNORE INTO CustomSpell (id, campaignId, name, level, school, casting_time, range, components, duration, description, classes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
                for (const spell of data.spells) { s.run(randomUUID(), campaignId, spell.name, spell.level || '0', spell.school || 'Univ', spell.casting_time || '1 az', spell.range || 'Contatto', spell.components || 'V, S', spell.duration || 'Ist', spell.description || '', spell.classes || ''); count++; }
            }
            if (data.skills) {
                const s = db.prepare(`INSERT OR IGNORE INTO CustomSkill (id, campaignId, name, ability, description) VALUES (?, ?, ?, ?, ?)`);
                for (const sk of data.skills) { s.run(randomUUID(), campaignId, sk.name, sk.ability || 'Varia', sk.description || ''); count++; }
            }
        })();
        return actionResponse({ imported: count });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

// --- AZIONI IMMAGINI E FILE ---

export async function uploadCardBackground(imageData: string, target: string) {
    try {
        const b64 = imageData.replace(/^data:image\/\w+;base64,/, "");
        const buf = Buffer.from(b64, 'base64');
        fs.writeFileSync(path.join(process.cwd(), 'public', target), buf);
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function uploadGenericImage(imageData: string) {
    try {
        const b64 = imageData.replace(/^data:image\/\w+;base64,/, "");
        const buf = Buffer.from(b64, 'base64');
        const name = `img_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
        const dir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, name), buf);
        return actionResponse({ url: `/uploads/${name}` });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

// --- AZIONI GENERATORI SPECIFICI ---

export async function generateShopAction(input: GenerateShopInput) {
    try {
        const data = await runAiWithRetry(() => generateShopFlow(input));
        return actionResponse(data);
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function generateLocationAction(input: GenerateLocationInput) {
    try {
        const data = await runAiWithRetry(() => generateLocationFlow(input));
        return actionResponse(data);
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function generateNpcAction(input: GenerateNpcInput) {
    try {
        const data = await runAiWithRetry(() => generateNpcFlow(input));
        return actionResponse(data);
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function generateCombatAction(input: GenerateCombatInput) {
    try {
        const data = await runAiWithRetry(() => generateCombatFlow(input));
        return actionResponse(data);
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function generateTreasureAction(input: GenerateTreasureInput) {
    try {
        const data = await runAiWithRetry(() => generateTreasureFlow(input));
        return actionResponse(data);
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

// --- AZIONI CRUD DATABASE ---

export async function saveMagicItem(item: Partial<MagicItem> & { campaignId: string }) {
    try {
        const id = item.id || randomUUID();
        db.prepare(`INSERT INTO MagicItem (id, name, type, rarity, attunement, description, cost, damage, techType, imageUrl, campaignId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(name, campaignId) DO UPDATE SET type=excluded.type, rarity=excluded.rarity, attunement=excluded.attunement, description=excluded.description, cost=excluded.cost, damage=excluded.damage, techType=excluded.techType, imageUrl=excluded.imageUrl`).run(id, item.name, item.type, item.rarity, item.attunement || 'No', item.description, item.cost || 'N/D', item.damage || '', item.techType || 'damage', item.imageUrl || null, item.campaignId);
        return actionResponse({ id });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function deleteMagicItem(id: string) {
    try {
        db.prepare("DELETE FROM MagicItem WHERE id = ?").run(id);
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function saveMonster(monster: Partial<Monster> & { campaignId: string }) {
    try {
        const id = monster.id || randomUUID();
        db.prepare(`INSERT INTO Monster (id, name, type, armorClass, hitPoints, challenge, description, imageUrl, campaignId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(name, campaignId) DO UPDATE SET type=excluded.type, armorClass=excluded.armorClass, hitPoints=excluded.hitPoints, challenge=excluded.challenge, description=excluded.description, imageUrl=excluded.imageUrl`).run(id, monster.name, monster.type, monster.armorClass, monster.hitPoints, monster.challenge, monster.description, monster.imageUrl || null, monster.campaignId);
        return actionResponse({ id });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function deleteMonster(id: string) {
    try {
        db.prepare("DELETE FROM Monster WHERE id = ?").run(id);
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function saveSpell(spell: Partial<Spell> & { campaignId: string }) {
    try {
        const id = spell.id || randomUUID();
        db.prepare(`INSERT INTO CustomSpell (id, name, level, school, casting_time, range, components, duration, description, classes, campaignId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(name, campaignId) DO UPDATE SET level=excluded.level, school=excluded.school, casting_time=excluded.casting_time, range=excluded.range, components=excluded.components, duration=excluded.duration, description=excluded.description, classes=excluded.classes`).run(id, spell.name, spell.level, spell.school, spell.casting_time, spell.range, spell.components, spell.duration, spell.description, spell.classes, spell.campaignId);
        return actionResponse({ id });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function deleteSpell(id: string) {
    try {
        db.prepare("DELETE FROM CustomSpell WHERE id = ?").run(id);
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function saveSkill(skill: Partial<Skill> & { campaignId: string }) {
    try {
        const id = skill.id || randomUUID();
        db.prepare(`INSERT INTO CustomSkill (id, name, ability, description, campaignId) VALUES (?, ?, ?, ?, ?) ON CONFLICT(name, campaignId) DO UPDATE SET ability=excluded.ability, description=excluded.description`).run(id, skill.name, skill.ability, skill.description, skill.campaignId);
        return actionResponse({ id });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function deleteSkill(id: string) {
    try {
        db.prepare("DELETE FROM CustomSkill WHERE id = ?").run(id);
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function saveShop(data: any) {
    try {
        const id = data.id || randomUUID();
        db.prepare(`INSERT INTO Shop (id, campaignId, name, owner, description, inventory, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, owner=excluded.owner, description=excluded.description, inventory=excluded.inventory, updatedAt=excluded.updatedAt`).run(id, data.campaignId, data.name, data.owner, data.description, data.inventory, new Date().toISOString());
        return actionResponse({ id });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function deleteShop(id: string) {
    try {
        db.prepare("DELETE FROM Shop WHERE id = ?").run(id);
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function saveWorldLocation(data: any) {
    try {
        const id = data.id || randomUUID();
        db.prepare(`INSERT INTO WorldLocation (id, campaignId, name, scale, style, atmosphere, details, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, scale=excluded.scale, style=excluded.style, atmosphere=excluded.atmosphere, details=excluded.details, updatedAt=excluded.updatedAt`).run(id, data.campaignId, data.name, data.scale, data.style, data.atmosphere, data.details, new Date().toISOString());
        return actionResponse({ id });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function deleteWorldLocation(id: string) {
    try {
        db.prepare("DELETE FROM WorldLocation WHERE id = ?").run(id);
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function saveNpc(data: any) {
    try {
        const id = data.id || randomUUID();
        db.prepare(`INSERT INTO Npc (id, campaignId, name, race, gender, age, status, alignment, details, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, race=excluded.race, gender=excluded.gender, age=excluded.age, status=excluded.status, alignment=excluded.alignment, details=excluded.details, updatedAt=excluded.updatedAt`).run(id, data.campaignId, data.name, data.race, data.gender, data.age, data.status, data.alignment, data.details, new Date().toISOString());
        return actionResponse({ id });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function deleteNpc(id: string) {
    try {
        db.prepare("DELETE FROM Npc WHERE id = ?").run(id);
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function saveCombat(data: any) {
    try {
        const id = data.id || randomUUID();
        db.prepare(`INSERT INTO Combat (id, campaignId, name, difficulty, details, updatedAt) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, difficulty=excluded.difficulty, details=excluded.details, updatedAt=excluded.updatedAt`).run(id, data.campaignId, data.name, data.difficulty, data.details, new Date().toISOString());
        return actionResponse({ id });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function deleteCombat(id: string) {
    try {
        db.prepare("DELETE FROM Combat WHERE id = ?").run(id);
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

// --- AZIONI PERSONAGGI E CRONOLOGIA ---

export async function savePlayerCharacter(pc: any) {
    try {
        const id = pc.id || randomUUID();
        db.prepare(`INSERT INTO PlayerCharacter (id, campaignId, name, race, class, archetype, level, hitPoints, armorClass, strength, dexterity, constitution, intelligence, wisdom, charisma, background, imageUrl, skills, spells, pact, school, domain, traits, ideals, bonds, flaws, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, race=excluded.race, class=excluded.class, archetype=excluded.archetype, level=excluded.level, hitPoints=excluded.hitPoints, armorClass=excluded.armorClass, strength=excluded.strength, dexterity=excluded.dexterity, constitution=excluded.constitution, intelligence=excluded.intelligence, wisdom=excluded.wisdom, charisma=excluded.charisma, background=excluded.background, imageUrl=excluded.imageUrl, skills=excluded.skills, spells=excluded.spells, pact=excluded.pact, school=excluded.school, domain=excluded.domain, traits=excluded.traits, ideals=excluded.ideals, bonds=excluded.bonds, flaws=excluded.flaws, updatedAt=excluded.updatedAt`).run(id, pc.campaignId, pc.name, pc.race, pc.class, pc.archetype, pc.level, pc.hitPoints, pc.armorClass, pc.strength, pc.dexterity, pc.constitution, pc.intelligence, pc.wisdom, pc.charisma, pc.background, pc.imageUrl, pc.skills ? JSON.stringify(pc.skills) : null, pc.spells, pc.pact, pc.school, pc.domain, pc.traits, pc.ideals, pc.bonds, pc.flaws, new Date().toISOString());
        return actionResponse({ id });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function deletePlayerCharacter(id: string) {
    try {
        db.prepare("DELETE FROM PlayerCharacter WHERE id = ?").run(id);
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function getNpcSummary(campaignId: string) {
    try {
        const npcs = db.prepare("SELECT * FROM Npc WHERE campaignId = ? ORDER BY name ASC").all(campaignId) as Npc[];
        const enriched = npcs.map(n => {
            const details = JSON.parse(n.details) as NpcDetails;
            const last = db.prepare(`SELECT e.*, s.session_number as num, s.title FROM CharacterEvent e JOIN Session s ON e.sessionId = s.id WHERE e.characterId = ? AND e.characterType = 'npc' ORDER BY s.session_number DESC, e.createdAt DESC LIMIT 1`).get(n.id) as any;
            return { ...n, details, lastEvent: last ? { sessionNumber: last.num, sessionTitle: last.title, eventDescription: last.eventDescription } : null };
        });
        return actionResponse(enriched);
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function getCharacterHistory(charId: string) {
    try {
        const history = db.prepare(`SELECT e.*, s.session_number as sessionNumber, s.title as sessionTitle FROM CharacterEvent e JOIN Session s ON e.sessionId = s.id WHERE e.characterId = ? ORDER BY s.session_number ASC, e.createdAt ASC`).all(charId) as any[];
        return actionResponse(history);
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function updateCharacterEvent(eventId: string, description: string) {
    try {
        db.prepare("UPDATE CharacterEvent SET eventDescription = ? WHERE id = ?").run(description, eventId);
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function deleteCharacterEvent(eventId: string) {
    try {
        db.prepare("DELETE FROM CharacterEvent WHERE id = ?").run(eventId);
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

// --- AZIONI POSSESSO E BACKUP ---

export async function toggleItemPossession(campaignId: string, itemName: string) {
    try {
        const existing = db.prepare("SELECT * FROM PossessedItems WHERE campaignId = ? AND itemName = ?").get(campaignId, itemName);
        if (existing) db.prepare("DELETE FROM PossessedItems WHERE campaignId = ? AND itemName = ?").run(campaignId, itemName);
        else db.prepare("INSERT INTO PossessedItems (campaignId, itemName) VALUES (?, ?)").run(campaignId, itemName);
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function getBackupData() {
    try {
        return actionResponse({
            Campaign: db.prepare("SELECT * FROM Campaign").all(),
            StoryArc: db.prepare("SELECT * FROM StoryArc").all(),
            Session: db.prepare("SELECT * FROM Session").all(),
            MagicItem: db.prepare("SELECT * FROM MagicItem").all(),
            Monster: db.prepare("SELECT * FROM Monster").all(),
            Reward: db.prepare("SELECT * FROM Reward").all(),
            CharacterEvent: db.prepare("SELECT * FROM CharacterEvent").all(),
            PlayerCharacter: db.prepare("SELECT * FROM PlayerCharacter").all(),
            CustomSpell: db.prepare("SELECT * FROM CustomSpell").all(),
            CustomSkill: db.prepare("SELECT * FROM CustomSkill").all(),
            PossessedItems: db.prepare("SELECT * FROM PossessedItems").all(),
            LetterPreset: db.prepare("SELECT * FROM LetterPreset").all(),
            Shop: db.prepare("SELECT * FROM Shop").all(),
            WorldLocation: db.prepare("SELECT * FROM WorldLocation").all(),
            Npc: db.prepare("SELECT * FROM Npc").all(),
            Combat: db.prepare("SELECT * FROM Combat").all(),
        });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function restoreBackupData(jsonString: string) {
    try {
        const data = JSON.parse(jsonString);
        db.transaction(() => {
            for (const table of Object.keys(data)) {
                db.prepare(`DELETE FROM ${table}`).run();
                if (data[table].length > 0) {
                    const cols = Object.keys(data[table][0]);
                    const stmt = db.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
                    for (const row of data[table]) stmt.run(...Object.values(row));
                }
            }
        })();
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function saveLetterPreset(name: string, settings: string) {
    try {
        db.prepare("INSERT INTO LetterPreset (id, name, settings) VALUES (?, ?, ?)").run(randomUUID(), name, settings);
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function deleteLetterPreset(id: string) {
    try {
        db.prepare("DELETE FROM LetterPreset WHERE id = ?").run(id);
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function quickSaveRewardAction(campaignId: string, name: string, description: string) {
    try {
        db.prepare(`INSERT INTO Reward (id, campaignId, sessionId, name, description) VALUES (?, ?, 'manual', ?, ?)`).run(randomUUID(), campaignId, name, description);
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function updateReward(reward: any) {
    try {
        db.prepare("UPDATE Reward SET name = ?, description = ? WHERE id = ?").run(reward.name, reward.description, reward.id);
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function deleteReward(id: string) {
    try {
        db.prepare("DELETE FROM Reward WHERE id = ?").run(id);
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

export async function migrateOldCharacters(campaignId: string, oldData: string) {
    try {
        const pcs = JSON.parse(oldData);
        db.transaction(() => {
            for (const pc of pcs) db.prepare(`INSERT INTO PlayerCharacter (id, campaignId, name, background, updatedAt) VALUES (?, ?, ?, ?, ?)`).run(randomUUID(), campaignId, pc.name, pc.description || '', new Date().toISOString());
        })();
        return actionResponse({ success: true });
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}
