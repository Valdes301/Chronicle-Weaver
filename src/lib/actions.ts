'use server';

import db from '@/lib/db';
import { initializeCampaign as initializeCampaignFlow } from '@/ai/flows/initialize-campaign';
import { extractEntities as extractEntitiesFlow } from '@/ai/flows/extract-entities';
import { generateNextSession as generateNextSessionFlow } from '@/ai/flows/generate-next-session';
import { summarizeCampaign as summarizeCampaignFlow } from '@/ai/flows/summarize-campaign';
import { summarizeArc as summarizeArcFlow } from '@/ai/flows/summarize-arc-flow';
import { generateMap as generateMapFlow, type GenerateMapInput } from '@/ai/flows/generate-map';
import { catalogHandbook as catalogHandbookFlow } from '@/ai/flows/catalog-handbook';
import { generateShop as generateShopFlow } from '@/ai/flows/generate-shop';
import { generateLocation as generateLocationFlow } from '@/ai/flows/generate-location';
import { generateNpc as generateNpcFlow } from '@/ai/flows/generate-npc';
import { generateCombat as generateCombatFlow } from '@/ai/flows/generate-combat';
import { generateTreasure as generateTreasureFlow } from '@/ai/flows/generate-treasure';
import { quickImprov as quickImprovFlow } from '@/ai/flows/quick-improv';
import { updateNpcIdentity as updateNpcIdentityFlow } from '@/ai/flows/update-npc-identity';
import { deepNpcElaboration as deepNpcElaborationFlow } from '@/ai/flows/deep-npc-elaboration';
import type { Session, CampaignWithRelations, Campaign, MagicItem, Monster, PlayerCharacter, Spell, Skill, LetterPreset, Shop, WorldLocation, Npc, NpcDetails, Combat, CombatDetails, GenerateCombatInput, GenerateNpcInput, GenerateShopInput, GenerateLocationInput, Reward, GenerateTreasureInput, CharacterEvent, StoryArc, HomebrewRule, ApiStats } from '@/lib/types';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// --- UTILITY PERCORSI PERSISTENTI (Fix Raspberry/Docker) ---

function getAssetDir() {
    const baseDir = process.env.DATABASE_URL 
        ? path.dirname(process.env.DATABASE_URL.replace('file:', '')) 
        : path.join(process.cwd(), 'data');
    
    const assetDir = path.join(baseDir, 'assets');
    if (!fs.existsSync(assetDir)) {
        fs.mkdirSync(assetDir, { recursive: true });
    }
    return assetDir;
}

async function logApiUsage(service: string, status: 'success' | 'error') {
    try {
        db.prepare("INSERT INTO ApiUsage (service, status) VALUES (?, ?)").run(service, status);
    } catch (e) {
        console.error("[UsageLog] Error:", e);
    }
}

async function runAiWithRetry<T>(aiCall: () => Promise<T>, serviceName: string, maxRetries = 5): Promise<T> {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const result = await aiCall();
            await logApiUsage(serviceName, 'success');
            return result;
        } catch (error: any) {
            lastError = error;
            const errorStr = String(error).toLowerCase();
            await logApiUsage(serviceName, 'error');
            const retryablePatterns = ['503', 'service unavailable', '429', 'too many requests', 'quota', 'high demand', 'overloaded', 'resource exhausted', 'deadline exceeded'];
            const isRetryable = retryablePatterns.some(p => errorStr.includes(p));
            if (isRetryable && i < maxRetries - 1) {
                const isQuotaError = errorStr.includes('429') || errorStr.includes('too many requests');
                const baseWait = isQuotaError ? 4000 : 2000;
                const waitTime = Math.pow(1.5, i) * baseWait + (Math.random() * 1000);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }
            throw error;
        }
    }
    throw lastError;
}

const actionResponse = <T>(data: T | null, error?: string) => {
    if (error) return { success: false, data: null, error };
    return { success: true, data, error: null };
}

async function getActiveHomebrewRulesString(campaignId: string): Promise<string> {
    try {
        const rules = db.prepare("SELECT title, content FROM HomebrewRule WHERE campaignId = ? AND isActive = 1").all(campaignId) as any[];
        if (rules.length === 0) return "";
        return rules.map(r => `Regola: ${r.title}\nDescrizione: ${r.content}`).join('\n\n');
    } catch (e) {
        console.error("Error fetching homebrew rules:", e);
        return "";
    }
}

async function getSystemOverride(slug: string): Promise<string | undefined> {
    try {
        const prompt = db.prepare("SELECT content FROM SystemPrompt WHERE slug = ?").get(slug) as { content: string };
        return prompt?.content;
    } catch (e) {
        return undefined;
    }
}

export async function getApiUsageStats(): Promise<{ success: boolean; data: ApiStats[] | null; error: string | null }> {
    try {
        const services = ['STORY', 'SUMMARY', 'SHOPS', 'WORLD', 'EXTRACTION', 'IMPORT'];
        const stats: ApiStats[] = [];
        for (const s of services) {
            const rpm = db.prepare("SELECT COUNT(*) as count FROM ApiUsage WHERE service = ? AND timestamp > datetime('now', '-1 minute')").get(s) as { count: number };
            const rpd = db.prepare("SELECT COUNT(*) as count FROM ApiUsage WHERE service = ? AND timestamp > datetime('now', '-24 hours')").get(s) as { count: number };
            const lastStatus = db.prepare("SELECT status FROM ApiUsage WHERE service = ? ORDER BY timestamp DESC LIMIT 1").get(s) as { status: string };
            stats.push({ service: s, rpm: rpm.count, rpd: rpd.count, status: lastStatus?.status || 'N/A' });
        }
        return actionResponse(stats);
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function getSystemStatus() {
    const keys = ['GEMINI_API_KEY', 'GEMINI_API_KEY_STORY', 'GEMINI_API_KEY_SUMMARY', 'GEMINI_API_KEY_SHOPS', 'GEMINI_API_KEY_WORLD', 'GEMINI_API_KEY_EXTRACTION', 'GEMINI_API_KEY_IMPORT'];
    const status = keys.map(k => {
        const val = (process.env[k] || '').trim();
        const isValid = val !== '' && val !== 'tua_chiave_qui' && val !== 'undefined';
        return { name: k, configured: isValid, preview: isValid ? `${val.substring(0, 4)}...${val.substring(val.length - 4)}` : 'Non impostata' };
    });
    return actionResponse(status);
}

// --- AZIONI CAMPAGNA ---

export async function createCampaign(data: { name: string; setting: string; description?: string | null; }) {
    try {
        const campaignId = randomUUID();
        const arcId = randomUUID();
        const now = new Date().toISOString();
        db.transaction(() => {
            db.prepare(`INSERT INTO Campaign (id, name, setting, description, summary, active_arc_label, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(campaignId, data.name, data.setting, data.description || null, "In attesa di inizializzazione...", "Arco Narrativo Attivo", now, now);
            db.prepare(`INSERT INTO StoryArc (id, campaignId, title, status, order_index, createdAt, updatedAt) VALUES (?, ?, ?, 'active', 0, ?, ?)`).run(arcId, campaignId, "Atto Iniziale", now, now);
        })();
        return actionResponse({ campaign: { id: campaignId }, progress: "La tua cronaca è stata creata correttamente!" });
    } catch (error: any) { return actionResponse(null, `Errore Salvataggio: ${error.message}`); }
}

export async function updateCampaignInfo(campaignId: string, name: string, setting: string) {
    try {
        db.prepare("UPDATE Campaign SET name = ?, setting = ?, updatedAt = ? WHERE id = ?").run(name, setting, new Date().toISOString(), campaignId);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function deleteCampaign(campaignId: string) {
    try {
        db.prepare("DELETE FROM Campaign WHERE id = ?").run(campaignId);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function initializeAiSummary(campaignId: string) {
    try {
        const campaign = db.prepare("SELECT * FROM Campaign WHERE id = ?").get(campaignId) as Campaign;
        if (!campaign) throw new Error("Campagna non trovata.");
        const aiResult = await runAiWithRetry(() => initializeCampaignFlow({ campaignName: campaign.name, setting: campaign.setting, description: campaign.description || undefined }), 'STORY');
        db.prepare("UPDATE Campaign SET summary = ?, updatedAt = ? WHERE id = ?").run(aiResult.initial_summary, new Date().toISOString(), campaignId);
        return actionResponse({ summary: aiResult.initial_summary });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function summarizeCampaign(campaignId: string) {
    try {
        const sessions = db.prepare("SELECT session_number, title, notes FROM Session WHERE campaignId = ? AND is_archived = 0 ORDER BY session_number ASC").all(campaignId) as any[];
        if (sessions.length === 0) return actionResponse({ success: true });
        const history = sessions.map(s => `Sessione ${s.session_number}: ${s.title}\n${s.notes}`).join('\n\n');
        const override = await getSystemOverride('summary-campaign');
        const result = await runAiWithRetry(() => summarizeCampaignFlow({ campaignHistory: history, systemOverride: override }), 'SUMMARY');
        db.prepare("UPDATE Campaign SET summary = ?, updatedAt = ? WHERE id = ?").run(result.summary, new Date().toISOString(), campaignId);
        return actionResponse({ success: true });
    } catch (error: any) { return actionResponse(null, error.message); }
}

// --- AZIONI BIBLIOTECA ---

export async function generateArcSummaryAction(arcId: string, sessionIds: string[]) {
    try {
        const arc = db.prepare("SELECT * FROM StoryArc WHERE id = ?").get(arcId) as StoryArc;
        if (!arc) throw new Error("Arco non trovato.");
        const placeholders = sessionIds.map(() => '?').join(',');
        const sessionsToSummarize = db.prepare(`SELECT session_number, title, notes FROM Session WHERE id IN (${placeholders}) ORDER BY session_number ASC`).all(...sessionIds) as any[];
        const override = await getSystemOverride('summary-arc');
        const result = await runAiWithRetry(() => summarizeArcFlow({ arcTitle: arc.title, existingSummary: arc.summary || undefined, sessions: sessionsToSummarize.map(s => ({ sessionNumber: s.session_number, title: s.title, notes: s.notes || '' })), campaignContext: (db.prepare("SELECT global_compendium FROM Campaign WHERE id = ?").get(arc.campaignId) as any)?.global_compendium || undefined, systemOverride: override }), 'SUMMARY');
        db.transaction(() => {
            const now = new Date().toISOString();
            db.prepare("UPDATE StoryArc SET title = ?, summary = ?, world_impact = ?, updatedAt = ? WHERE id = ?").run(result.newTitle, result.summary, result.worldImpact, now, arcId);
            const updateSession = db.prepare("UPDATE Session SET is_summarized = 1, updatedAt = ? WHERE id = ?");
            sessionIds.forEach(id => updateSession.run(now, id));
            if (arc.status === 'active') db.prepare("UPDATE Campaign SET summary = ?, updatedAt = ? WHERE id = ?").run(result.summary, now, arc.campaignId);
            const allArchived = db.prepare("SELECT title, summary, world_impact FROM StoryArc WHERE campaignId = ? AND status = 'archived' AND summary IS NOT NULL ORDER BY order_index ASC").all(arc.campaignId) as any[];
            const newCompendium = allArchived.length > 0 ? allArchived.map(a => `### ${a.title}\n${a.summary}\n\n**Impatto:**\n${a.world_impact || 'Nessuna nota.'}`).join('\n\n---\n\n') : null;
            db.prepare("UPDATE Campaign SET global_compendium = ? WHERE id = ?").run(newCompendium, arc.campaignId);
        })();
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function getStoryArcs(campaignId: string) {
    try {
        const arcs = db.prepare("SELECT * FROM StoryArc WHERE campaignId = ? ORDER BY order_index ASC, createdAt ASC").all(campaignId) as StoryArc[];
        return actionResponse(arcs);
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function updateStoryArc(arcId: string, title: string, summary: string, worldImpact: string) {
    try {
        db.prepare("UPDATE StoryArc SET title = ?, summary = ?, world_impact = ?, updatedAt = ? WHERE id = ?").run(title, summary, worldImpact, new Date().toISOString(), arcId);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function deleteStoryArc(arcId: string) {
    try {
        const arc = db.prepare("SELECT * FROM StoryArc WHERE id = ?").get(arcId) as StoryArc;
        if (!arc) throw new Error("Arco non trovato.");
        const campaignId = arc.campaignId;
        const now = new Date().toISOString();
        db.transaction(() => {
            if (arc.status === 'active') {
                db.prepare("UPDATE StoryArc SET summary = NULL, world_impact = NULL, updatedAt = ? WHERE id = ?").run(now, arcId);
                db.prepare("UPDATE Session SET is_summarized = 0, updatedAt = ? WHERE arcId = ?").run(now, arcId);
                db.prepare("UPDATE Campaign SET summary = NULL, updatedAt = ? WHERE id = ?").run(now, campaignId);
            } else {
                const activeArc = db.prepare("SELECT id FROM StoryArc WHERE campaignId = ? AND status = 'active'").get(campaignId) as { id: string };
                if (activeArc) db.prepare("UPDATE Session SET arcId = ?, is_archived = 0, is_summarized = 0, updatedAt = ? WHERE arcId = ?").run(activeArc.id, now, arcId);
                db.prepare("DELETE FROM StoryArc WHERE id = ?").run(arcId);
            }
            const allRemaining = db.prepare("SELECT title, summary, world_impact FROM StoryArc WHERE campaignId = ? AND status = 'archived' AND summary IS NOT NULL ORDER BY order_index ASC").all(campaignId) as any[];
            const newCompendium = allRemaining.length > 0 ? allRemaining.map(a => `### ${a.title}\n${a.summary}\n\n**Impatto:**\n${a.world_impact || 'Nessuna nota.'}`).join('\n\n---\n\n') : null;
            db.prepare("UPDATE Campaign SET global_compendium = ?, updatedAt = ? WHERE id = ?").run(newCompendium, now, campaignId);
        })();
        return actionResponse({ success: true });
    } catch (error: any) { return actionResponse(null, error.message); }
}

export async function getArchiveSessions(arcId: string) {
    try {
        const sessions = db.prepare("SELECT * FROM Session WHERE arcId = ? ORDER BY session_number ASC, createdAt ASC").all(arcId) as Session[];
        return actionResponse(sessions);
    } catch (e: any) { return actionResponse(null, e.message); }
}

// --- AZIONI SESSIONI ---

export async function generateNextSession(campaign: CampaignWithRelations, recentSessions: Session[], prompt: string, modification?: { storyToModify: string, request: string }) {
    try {
        const playerCharactersJson = JSON.stringify(campaign.playerCharacters || []);
        const recentSummary = recentSessions.slice(-3).map(s => `Sess ${s.session_number}: ${s.title}\n${s.notes}`).join('\n---\n');
        const homebrewContext = await getActiveHomebrewRulesString(campaign.id);
        const override = await getSystemOverride('story-gen');
        const result = await runAiWithRetry(() => generateNextSessionFlow({ campaignName: campaign.name, campaignSetting: campaign.setting, campaignSummary: campaign.summary || undefined, recentSessionsSummary: recentSummary || "Inizio campagna.", playerCharacters: playerCharactersJson, customPrompt: prompt, storyToModify: modification?.storyToModify, modificationRequest: modification?.request, homebrewRules: homebrewContext || undefined, systemOverride: override }), 'STORY');
        return actionResponse(result);
    } catch (error: any) { return actionResponse(null, error.message); }
}

export async function confirmSession(sessionData: any, campaignId: string) {
    try {
        const activeArc = db.prepare("SELECT id FROM StoryArc WHERE campaignId = ? AND status = 'active'").get(campaignId) as { id: string };
        const id = randomUUID();
        const now = new Date().toISOString();
        db.prepare(`INSERT INTO Session (id, session_number, title, notes, xp_award, source, campaignId, arcId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, sessionData.session_number, sessionData.title, sessionData.notes, sessionData.xp_award, sessionData.source, campaignId, activeArc.id, now, now);
        return actionResponse({ id });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function updateSessionMetadata(sessionId: string, title: string, num: number) {
    try {
        db.prepare("UPDATE Session SET title = ?, session_number = ?, updatedAt = ? WHERE id = ?").run(title, num, new Date().toISOString(), sessionId);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function updateSessionTitle(sessionId: string, title: string) {
    try {
        db.prepare("UPDATE Session SET title = ?, updatedAt = ? WHERE id = ?").run(title, new Date().toISOString(), sessionId);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function updateSessionNumber(sessionId: string, num: number) {
    try {
        db.prepare("UPDATE Session SET session_number = ?, updatedAt = ? WHERE id = ?").run(num, new Date().toISOString(), sessionId);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function updateSessionNotes(sessionId: string, newNotes: string) {
    try {
        db.prepare("UPDATE Session SET notes = ?, updatedAt = ? WHERE id = ?").run(newNotes, new Date().toISOString(), sessionId);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function updateSessionXp(sessionId: string, xp: number) {
    try {
        db.prepare("UPDATE Session SET xp_award = ?, updatedAt = ? WHERE id = ?").run(xp, new Date().toISOString(), sessionId);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function toggleSessionReadStatus(sessionId: string) {
    try {
        db.prepare("UPDATE Session SET is_read = NOT is_read, updatedAt = ? WHERE id = ?").run(new Date().toISOString(), sessionId);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function deleteSession(sessionId: string) {
    try {
        db.prepare("DELETE FROM Session WHERE id = ?").run(sessionId);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
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
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function resyncSessionNumbers(campaignId: string) {
    try {
        const sessions = db.prepare("SELECT id FROM Session WHERE campaignId = ? ORDER BY session_number ASC, createdAt ASC").all(campaignId) as { id: string }[];
        db.transaction(() => {
            const updateStmt = db.prepare("UPDATE Session SET session_number = ? WHERE id = ?");
            sessions.forEach((s, idx) => updateStmt.run(idx + 1, s.id));
        })();
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function archiveActiveArc(campaignId: string, arcId: string) {
    try {
        const now = new Date().toISOString();
        const newArcId = randomUUID();
        const campaign = db.prepare("SELECT summary FROM Campaign WHERE id = ?").get(campaignId) as { summary: string | null };
        db.transaction(() => {
            db.prepare("UPDATE StoryArc SET status = 'archived', summary = ?, updatedAt = ? WHERE id = ?").run(campaign.summary, now, arcId);
            db.prepare("UPDATE Session SET is_archived = 1, updatedAt = ? WHERE arcId = ?").run(now, arcId);
            db.prepare("UPDATE Campaign SET summary = NULL, updatedAt = ? WHERE id = ?").run(now, campaignId);
            db.prepare(`INSERT INTO StoryArc (id, campaignId, title, status, order_index, createdAt, updatedAt) VALUES (?, ?, 'Nuovo Capitolo', 'active', 1, ?, ?)`).run(newArcId, campaignId, now, now);
            const allArchived = db.prepare("SELECT title, summary, world_impact FROM StoryArc WHERE campaignId = ? AND status = 'archived' AND summary IS NOT NULL ORDER BY order_index ASC").all(campaignId) as any[];
            const newCompendium = allArchived.length > 0 ? allArchived.map(a => `### ${a.title}\n${a.summary}\n\n**Impatto:**\n${a.world_impact || 'Nessuna nota.'}`).join('\n\n---\n\n') : null;
            db.prepare("UPDATE Campaign SET global_compendium = ? WHERE id = ?").run(newCompendium, campaignId);
        })();
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function archiveSingleSession(sessionId: string) {
    try {
        const now = new Date().toISOString();
        db.prepare("UPDATE Session SET is_archived = 1, updatedAt = ? WHERE id = ?").run(now, sessionId);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function updateActiveArcInfo(campaignId: string, arcId: string, title: string, label: string) {
    try {
        db.transaction(() => {
            db.prepare("UPDATE StoryArc SET title = ? WHERE id = ?").run(title, arcId);
            db.prepare("UPDATE Campaign SET active_arc_label = ? WHERE id = ?").run(label, campaignId);
        })();
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

// --- AZIONI BOTTINO E SCANSIONE ---

export async function scanSessionForLoot(sessionId: string) {
    try {
        const session = db.prepare("SELECT * FROM Session WHERE id = ?").get(sessionId) as Session;
        if (!session || !session.notes) throw new Error("Sessione non trovata.");
        const knownCharacters = [...(db.prepare("SELECT name FROM PlayerCharacter WHERE campaignId = ?").all(session.campaignId) as any[]).map(c => c.name), ...(db.prepare("SELECT name FROM Npc WHERE campaignId = ?").all(session.campaignId) as any[]).map(n => n.name)];
        const override = await getSystemOverride('extract-gen');
        const entities = await runAiWithRetry(() => extractEntitiesFlow({ storyText: session.notes!, existingCharacters: knownCharacters, systemOverride: override }), 'EXTRACTION');
        db.transaction(() => {
            const now = new Date().toISOString();
            for (const item of entities.newMagicItems) {
                db.prepare(`INSERT INTO MagicItem (id, name, type, rarity, attunement, description, cost, damage, techType, imageUrl, campaignId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(name, campaignId) DO UPDATE SET type=excluded.type, rarity=excluded.rarity, attunement=excluded.attunement, description=excluded.description, cost=excluded.cost, damage=excluded.damage, techType=excluded.techType, imageUrl=excluded.imageUrl`).run(randomUUID(), item.name, item.type, item.rarity, item.attunement || 'No', item.description, item.cost || 'N/D', item.damage || '', 'damage', null, session.campaignId);
                const actual = db.prepare("SELECT id FROM MagicItem WHERE name = ? AND campaignId = ?").get(item.name, session.campaignId) as { id: string };
                if (actual) db.prepare(`INSERT OR IGNORE INTO SessionLoot (sessionId, entityId, entityType) VALUES (?, ?, 'item')`).run(sessionId, actual.id);
            }
            for (const m of entities.newMonsters) {
                db.prepare(`INSERT INTO Monster (id, name, type, armorClass, hitPoints, challenge, description, imageUrl, campaignId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(name, campaignId) DO UPDATE SET type=excluded.type, armorClass=excluded.armorClass, hitPoints=excluded.hitPoints, challenge=excluded.challenge, description=excluded.description, imageUrl=excluded.imageUrl`).run(randomUUID(), m.name, m.type, m.armorClass, m.hitPoints, m.challenge, m.description, null, session.campaignId);
                const actual = db.prepare("SELECT id FROM Monster WHERE name = ? AND campaignId = ?").get(m.name, session.campaignId) as { id: string };
                if (actual) db.prepare(`INSERT OR IGNORE INTO SessionLoot (sessionId, entityId, entityType) VALUES (?, ?, 'monster')`).run(sessionId, actual.id);
            }
            for (const r of entities.rewards) db.prepare(`INSERT INTO Reward (id, campaignId, sessionId, name, description) VALUES (?, ?, ?, ?, ?)`).run(randomUUID(), session.campaignId, sessionId, r.name, r.description);
            for (const event of entities.characterEvents) {
                const pc = db.prepare("SELECT id FROM PlayerCharacter WHERE LOWER(name) = LOWER(?) AND campaignId = ?").get(event.name, session.campaignId) as { id: string };
                let charId = pc?.id;
                let charType: 'pc' | 'npc' = 'pc';
                if (!charId) {
                    const npc = db.prepare("SELECT id FROM Npc WHERE LOWER(name) = LOWER(?) AND campaignId = ?").get(event.name, session.campaignId) as { id: string };
                    charId = npc?.id;
                    charType = 'npc';
                    if (!charId && event.isNew) {
                        charId = randomUUID();
                        const d: NpcDetails = { name: event.name, race: 'Sconosciuta', occupation: 'Rilevato', appearance: 'Dati sensoriali in attesa di catalogo.', personality: 'Personalità da definire.', mannerism: '—', secret: 'Segreto ignoto.', encounterHook: event.event };
                        db.prepare(`INSERT INTO Npc (id, campaignId, name, race, details, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`).run(charId, session.campaignId, event.name, 'Sconosciuta', JSON.stringify(d), now);
                    }
                }
                if (charId) db.prepare(`INSERT INTO CharacterEvent (id, characterId, characterType, sessionId, campaignId, eventDescription, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(randomUUID(), charId, charType, sessionId, session.campaignId, event.event, now);
            }
            db.prepare("UPDATE Session SET loot_scanned = 1, updatedAt = ? WHERE id = ?").run(now, sessionId);
        })();
        return actionResponse({ success: true });
    } catch (error: any) { return actionResponse(null, error.message); }
}

export async function getSessionLoot(sessionId: string) {
    try {
        const items = db.prepare(`SELECT m.* FROM MagicItem m JOIN SessionLoot l ON m.id = l.entityId WHERE l.sessionId = ? AND l.entityType = 'item'`).all(sessionId) as MagicItem[];
        const monsters = db.prepare(`SELECT m.* FROM Monster m JOIN SessionLoot l ON m.id = l.entityId WHERE l.sessionId = ? AND l.entityType = 'monster'`).all(sessionId) as Monster[];
        const rewards = db.prepare("SELECT * FROM Reward WHERE sessionId = ?").all(sessionId) as Reward[];
        const characterEvents = db.prepare(`SELECT e.*, CASE WHEN e.characterType = 'pc' THEN p.name ELSE n.name END as characterName, e.characterType FROM CharacterEvent e LEFT JOIN PlayerCharacter p ON e.characterId = p.id AND e.characterType = 'pc' LEFT JOIN Npc n ON e.characterId = n.id AND e.characterType = 'npc' WHERE e.sessionId = ?`).all(sessionId) as any[];
        return actionResponse({ items, monsters, rewards, characterEvents });
    } catch (e: any) { return actionResponse(null, e.message); }
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
    } catch (e: any) { return actionResponse(null, e.message); }
}

// --- AZIONI GENERATORI IA ---

export async function generateMapAction(input: GenerateMapInput) {
    try {
        const svgString = await runAiWithRetry(() => generateMapFlow(input), 'SUMMARY');
        return actionResponse({ svgString });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function getAllWorldLocationsAction() {
    try {
        const data = db.prepare("SELECT * FROM WorldLocation ORDER BY updatedAt DESC").all();
        return actionResponse(data);
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function catalogHandbookAction(content: string, photoDataUri?: string) {
    try {
        const override = await getSystemOverride('catalog-gen');
        const data = await runAiWithRetry(() => catalogHandbookFlow({ content, photoDataUri, systemOverride: override }), 'IMPORT');
        return actionResponse(data);
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function generateShopAction(input: GenerateShopInput) {
    try {
        const override = await getSystemOverride('shop-gen');
        const data = await runAiWithRetry(() => generateShopFlow({ ...input, systemOverride: override }), 'SHOPS');
        return actionResponse(data);
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function generateLocationAction(input: GenerateLocationInput) {
    try {
        const override = await getSystemOverride('world-gen');
        const data = await runAiWithRetry(() => generateLocationFlow({ ...input, systemOverride: override }), 'WORLD');
        return actionResponse(data);
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function generateNpcAction(input: GenerateNpcInput) {
    try {
        const override = await getSystemOverride('npc-gen');
        const data = await runAiWithRetry(() => generateNpcFlow({ ...input, systemOverride: override }), 'WORLD');
        return actionResponse(data);
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function generateCombatAction(input: GenerateCombatInput) {
    try {
        const override = await getSystemOverride('combat-gen');
        const data = await runAiWithRetry(() => generateCombatFlow({ ...input, systemOverride: override }), 'WORLD');
        return actionResponse(data);
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function generateTreasureAction(input: GenerateTreasureInput) {
    try {
        const override = await getSystemOverride('treasure-gen');
        const data = await runAiWithRetry(() => generateTreasureFlow({ ...input, systemOverride: override }), 'SHOPS');
        return actionResponse(data);
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function quickImprovAction(input: { campaignId: string, question: string, numPlot: number, numWorld: number, numFalse: number, category?: string }) {
  try {
      const campaign = db.prepare("SELECT * FROM Campaign WHERE id = ?").get(input.campaignId) as Campaign;
      const activeArc = db.prepare("SELECT title FROM StoryArc WHERE campaignId = ? AND status = 'active'").get(input.campaignId) as any;
      const override = await getSystemOverride('improv-gen');
      let finalQuestion = input.question;
      if (!finalQuestion || finalQuestion.includes("Genera spunti casuali")) {
          const cat = input.category || 'dicerie';
          const labels: Record<string, string> = { 'dicerie': 'nuove dicerie e segreti locali', 'conseguenze': 'conseguenze impreviste alle ultime azioni dei giocatori', 'clima': 'dettagli sull\'atmosfera, il meteo e le sensazioni ambientali', 'incontri': 'piccoli incontri casuali o interazioni con la folla', 'nomi': 'una lista di nomi evocativi per persone o luoghi' };
          finalQuestion = `L'avventura prosegue. Genera ${labels[cat] || 'nuovi spunti'} per il contesto attuale.`;
      }
      const result = await runAiWithRetry(() => quickImprovFlow({ campaignName: campaign.name, campaignSetting: campaign.setting, campaignSummary: campaign.summary || undefined, currentArcTitle: activeArc?.title, question: finalQuestion, numPlot: input.numPlot, numWorld: input.numWorld, numFalse: input.numFalse, systemOverride: override }), 'STORY');
      return actionResponse(result);
  } catch (e: any) { return actionResponse(null, e.message); }
}

export async function updateNpcIdentityAction(npcId: string, campaignId: string) {
    try {
        const npc = db.prepare("SELECT * FROM Npc WHERE id = ?").get(npcId) as Npc;
        if (!npc) throw new Error("PNG non trovato.");
        const campaign = db.prepare("SELECT summary FROM Campaign WHERE id = ?").get(campaignId) as { summary: string | null };
        const history = db.prepare(`SELECT e.eventDescription, s.session_number FROM CharacterEvent e JOIN Session s ON e.sessionId = s.id WHERE e.characterId = ? AND e.characterType = 'npc' ORDER BY s.session_number ASC`).all(npcId) as any[];
        const historyText = history.length > 0 ? history.map(h => `Sess ${h.session_number}: ${h.eventDescription}`).join('\n') : "Nessuna azione registrata nelle sessioni finora.";
        const override = await getSystemOverride('npc-gen');
        const data = await runAiWithRetry(() => updateNpcIdentityFlow({ npcName: npc.name, npcRace: npc.race, history: historyText, campaignSummary: campaign.summary || undefined, systemOverride: override }), 'WORLD');
        db.prepare(`UPDATE Npc SET name = ?, race = ?, gender = ?, age = ?, status = ?, alignment = ?, details = ?, updatedAt = ? WHERE id = ?`).run(data.name, data.race, data.gender, data.age, data.status, data.alignment, JSON.stringify(data), new Date().toISOString(), npcId);
        return actionResponse(data);
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function deepNpcElaborationAction(npcId: string, campaignId: string) {
    try {
        const npc = db.prepare("SELECT * FROM Npc WHERE id = ?").get(npcId) as Npc;
        if (!npc) throw new Error("PNG non trovato.");
        const campaign = db.prepare("SELECT setting FROM Campaign WHERE id = ?").get(campaignId) as { setting: string };
        const sessions = db.prepare("SELECT session_number, title, notes FROM Session WHERE campaignId = ? ORDER BY session_number ASC").all(campaignId) as any[];
        const allText = sessions.map(s => `Sessione ${s.session_number}: ${s.title}\n${s.notes}`).join('\n\n---\n\n');
        const override = await getSystemOverride('npc-gen');
        const result = await runAiWithRetry(() => deepNpcElaborationFlow({ npcName: npc.name, npcRace: npc.race, campaignSetting: campaign.setting, allSessionsText: allText, systemOverride: override }), 'WORLD');
        db.transaction(() => {
            const now = new Date().toISOString();
            db.prepare("DELETE FROM CharacterEvent WHERE characterId = ? AND characterType = 'npc'").run(npcId);
            for (const ev of result.events) {
                const sess = db.prepare("SELECT id FROM Session WHERE session_number = ? AND campaignId = ?").get(ev.sessionNumber, campaignId) as { id: string };
                if (sess) db.prepare(`INSERT INTO CharacterEvent (id, characterId, characterType, sessionId, campaignId, eventDescription, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(randomUUID(), npcId, 'npc', sess.id, campaignId, ev.eventDescription, now);
            }
            db.prepare(`UPDATE Npc SET name = ?, race = ?, gender = ?, age = ?, status = ?, alignment = ?, details = ?, updatedAt = ? WHERE id = ?`).run(result.identity.name, result.identity.race, result.identity.gender, result.identity.age, result.identity.status, result.identity.alignment, JSON.stringify(result.identity), now, npcId);
        })();
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

// --- AZIONI CRUD DATABASE ---

export async function saveMagicItem(item: Partial<MagicItem> & { campaignId: string }) {
    try {
        const id = item.id || randomUUID();
        const now = new Date().toISOString();
        db.prepare(`INSERT INTO MagicItem (id, name, type, rarity, attunement, description, cost, damage, techType, imageUrl, campaignId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(name, campaignId) DO UPDATE SET type=excluded.type, rarity=excluded.rarity, attunement=excluded.attunement, description=excluded.description, cost=excluded.cost, damage=excluded.damage, techType=excluded.techType, imageUrl=excluded.imageUrl, updatedAt=excluded.updatedAt`).run(id, item.name, item.type, item.rarity, item.attunement || 'No', item.description, item.cost || 'N/D', item.damage || '', item.techType || 'damage', item.imageUrl || null, item.campaignId, now, now);
        return actionResponse({ id });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function deleteMagicItem(id: string) {
    try {
        db.prepare("DELETE FROM MagicItem WHERE id = ?").run(id);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function saveMonster(monster: Partial<Monster> & { campaignId: string }) {
    try {
        const id = monster.id || randomUUID();
        const now = new Date().toISOString();
        db.prepare(`INSERT INTO Monster (id, name, type, armorClass, hitPoints, challenge, description, imageUrl, campaignId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(name, campaignId) DO UPDATE SET type=excluded.type, armorClass=excluded.armorClass, hitPoints=excluded.hitPoints, challenge=excluded.challenge, description=excluded.description, imageUrl=excluded.imageUrl, updatedAt=excluded.updatedAt`).run(id, monster.name, monster.type, monster.armorClass, monster.hitPoints, monster.challenge, monster.description, monster.imageUrl || null, monster.campaignId, now, now);
        return actionResponse({ id });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function deleteMonster(id: string) {
    try {
        db.prepare("DELETE FROM Monster WHERE id = ?").run(id);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function saveSpell(spell: Partial<Spell> & { campaignId: string }) {
    try {
        const id = spell.id || randomUUID();
        const now = new Date().toISOString();
        db.prepare(`INSERT INTO CustomSpell (id, name, level, school, casting_time, range, components, duration, description, classes, campaignId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(name, campaignId) DO UPDATE SET level=excluded.level, school=excluded.school, casting_time=excluded.casting_time, range=excluded.range, components=excluded.components, duration=excluded.duration, description=excluded.description, classes=excluded.classes, updatedAt=excluded.updatedAt`).run(id, spell.name, spell.level, spell.school, spell.casting_time, spell.range, spell.components, spell.duration, spell.description, spell.classes, spell.campaignId, now, now);
        return actionResponse({ id });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function deleteSpell(id: string) {
    try {
        db.prepare("DELETE FROM CustomSpell WHERE id = ?").run(id);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function saveSkill(skill: Partial<Skill> & { campaignId: string }) {
    try {
        const id = skill.id || randomUUID();
        const now = new Date().toISOString();
        db.prepare(`INSERT INTO CustomSkill (id, name, ability, description, campaignId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(name, campaignId) DO UPDATE SET ability=excluded.ability, description=excluded.description, updatedAt=excluded.updatedAt`).run(id, skill.name, skill.ability, skill.description, skill.campaignId, now, now);
        return actionResponse({ id });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function deleteSkill(id: string) {
    try {
        db.prepare("DELETE FROM CustomSkill WHERE id = ?").run(id);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function bulkImportAction(campaignId: string, data: any) {
    try {
        let count = 0;
        db.transaction(() => {
            const now = new Date().toISOString();
            if (data.items) {
                const s = db.prepare(`INSERT OR IGNORE INTO MagicItem (id, campaignId, name, type, rarity, attunement, description, cost, damage, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
                for (const it of data.items) { s.run(randomUUID(), campaignId, it.name, it.type || 'Oggetto', it.rarity || 'Comune', it.attunement || 'No', it.description || '', it.cost || 'N/D', it.damage || '', now, now); count++; }
            }
            if (data.monsters) {
                const s = db.prepare(`INSERT OR IGNORE INTO Monster (id, campaignId, name, type, armorClass, hitPoints, challenge, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
                for (const m of data.monsters) { s.run(randomUUID(), campaignId, m.name, m.type || 'Mostro', m.armorClass || '10', m.hitPoints || '10', m.challenge || '0', m.description || '', now, now); count++; }
            }
            if (data.spells) {
                const s = db.prepare(`INSERT OR IGNORE INTO CustomSpell (id, campaignId, name, level, school, casting_time, range, components, duration, description, classes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
                for (const spell of data.spells) { s.run(randomUUID(), campaignId, spell.name, spell.level || '0', spell.school || 'Univ', spell.casting_time || '1 az', spell.range || 'Contatto', spell.components || 'V, S', spell.duration || 'Ist', spell.description || '', spell.classes || '', now, now); count++; }
            }
            if (data.skills) {
                const s = db.prepare(`INSERT OR IGNORE INTO CustomSkill (id, campaignId, name, ability, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`);
                for (const sk of data.skills) { s.run(randomUUID(), campaignId, sk.name, sk.ability || 'Varia', sk.description || '', now, now); count++; }
            }
        })();
        return actionResponse({ imported: count });
    } catch (e: any) { return actionResponse(null, e.message); }
}

// --- AZIONI CRUD HOMEBREW ---

export async function getHomebrewRules(campaignId: string) {
    try {
        const rules = db.prepare("SELECT * FROM HomebrewRule WHERE campaignId = ? ORDER BY category ASC, title ASC").all(campaignId) as HomebrewRule[];
        return actionResponse(rules);
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function saveHomebrewRule(data: Partial<HomebrewRule> & { campaignId: string }) {
    try {
        const id = data.id || randomUUID();
        const now = new Date().toISOString();
        db.prepare(`INSERT INTO HomebrewRule (id, campaignId, title, content, category, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title=excluded.title, content=excluded.content, category=excluded.category, isActive=excluded.isActive, updatedAt=excluded.updatedAt`).run(id, data.campaignId, data.title, data.content, data.category || 'Generale', data.isActive ? 1 : 0, now, now);
        return actionResponse({ id });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function deleteHomebrewRule(id: string) {
    try {
        db.prepare("DELETE FROM HomebrewRule WHERE id = ?").run(id);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function toggleHomebrewRule(id: string) {
    try {
        db.prepare("UPDATE HomebrewRule SET isActive = NOT isActive, updatedAt = ? WHERE id = ?").run(new Date().toISOString(), id);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

// --- AZIONI SYSTEM PROMPTS ---

export async function getAllSystemPrompts() {
    try {
        const data = db.prepare("SELECT * FROM SystemPrompt ORDER BY title ASC").all();
        return actionResponse(data);
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function updateSystemPrompt(slug: string, content: string) {
    try {
        db.prepare("UPDATE SystemPrompt SET content = ?, updatedAt = ? WHERE slug = ?").run(content, new Date().toISOString(), slug);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function resetSystemPrompt(slug: string) {
    try {
        const p = db.prepare("SELECT defaultContent FROM SystemPrompt WHERE slug = ?").get(slug) as any;
        db.prepare("UPDATE SystemPrompt SET content = ?, updatedAt = ? WHERE slug = ?").run(p.defaultContent, new Date().toISOString(), slug);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

// --- ALTRE AZIONI ---

export async function savePlayerCharacter(pc: any) {
    try {
        const id = pc.id || randomUUID();
        const now = new Date().toISOString();
        db.prepare(`INSERT INTO PlayerCharacter (id, campaignId, name, race, class, archetype, level, hitPoints, armorClass, strength, dexterity, constitution, intelligence, wisdom, charisma, background, imageUrl, spells, traits, ideals, bonds, flaws, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, race=excluded.race, class=excluded.class, archetype=excluded.archetype, level=excluded.level, hitPoints=excluded.hitPoints, armorClass=excluded.armorClass, strength=excluded.strength, dexterity=excluded.dexterity, constitution=excluded.constitution, intelligence=excluded.intelligence, wisdom=excluded.wisdom, charisma=excluded.charisma, background=excluded.background, imageUrl=excluded.imageUrl, spells=excluded.spells, traits=excluded.traits, ideals=excluded.ideals, bonds=excluded.bonds, flaws=excluded.flaws, updatedAt=excluded.updatedAt`).run(id, pc.campaignId, pc.name, pc.race ?? null, pc.class ?? null, pc.archetype ?? null, pc.level ?? null, pc.hitPoints ?? null, pc.armorClass ?? null, pc.strength ?? null, pc.dexterity ?? null, pc.constitution ?? null, pc.intelligence ?? null, pc.wisdom ?? null, pc.charisma ?? null, pc.background ?? null, pc.imageUrl ?? null, pc.spells ?? null, pc.traits ?? null, pc.ideals ?? null, pc.bonds ?? null, pc.flaws ?? null, now, now);
        return actionResponse({ id });
    } catch (e: any) { 
        console.error("[SavePC] Error:", e);
        return actionResponse(null, e.message); 
    }
}

export async function deletePlayerCharacter(id: string) {
    try {
        db.prepare("DELETE FROM PlayerCharacter WHERE id = ?").run(id);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
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
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function getCharacterHistory(charId: string) {
    try {
        const history = db.prepare(`SELECT e.*, s.session_number as sessionNumber, s.title as sessionTitle FROM CharacterEvent e JOIN Session s ON e.sessionId = s.id WHERE e.characterId = ? ORDER BY s.session_number DESC, e.createdAt ASC`).all(charId) as any[];
        return actionResponse(history);
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function updateCharacterEvent(eventId: string, description: string) {
    try {
        db.prepare("UPDATE CharacterEvent SET eventDescription = ? WHERE id = ?").run(description, eventId);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function deleteCharacterEvent(eventId: string) {
    try {
        db.prepare("DELETE FROM CharacterEvent WHERE id = ?").run(eventId);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function uploadGenericImage(imageData: string) {
    try {
        const b64 = imageData.replace(/^data:image\/\w+;base64,/, "");
        const buf = Buffer.from(b64, 'base64');
        const name = `img_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
        const dir = getAssetDir();
        fs.writeFileSync(path.join(dir, name), buf);
        return actionResponse({ url: `/api/assets/${name}` });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function getBackupData() {
    try {
        const tables = ['Campaign', 'StoryArc', 'Session', 'MagicItem', 'Monster', 'SessionLoot', 'Reward', 'CharacterEvent', 'PlayerCharacter', 'CustomSpell', 'CustomSkill', 'PossessedItems', 'LetterPreset', 'Shop', 'WorldLocation', 'Npc', 'Combat', 'HomebrewRule', 'SystemPrompt', 'ApiUsage'];
        const backup: Record<string, any[]> = {};
        for (const table of tables) {
            try { backup[table] = db.prepare(`SELECT * FROM ${table}`).all(); } catch (err) { backup[table] = []; }
        }
        return actionResponse(backup);
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function restoreBackupData(jsonString: string) {
    try {
        const data = JSON.parse(jsonString);
        if (!data || typeof data !== 'object') throw new Error("Formato backup non valido.");
        const tableMapping: Record<string, string> = { 'campaigns': 'Campaign', 'campaign': 'Campaign', 'story_arcs': 'StoryArc', 'storyarc': 'StoryArc', 'sessions': 'Session', 'session': 'Session', 'magic_items': 'MagicItem', 'magicitem': 'MagicItem', 'monsters': 'Monster', 'monster': 'Monster', 'rewards': 'Reward', 'reward': 'Reward', 'character_events': 'CharacterEvent', 'characterevent': 'CharacterEvent', 'player_characters': 'PlayerCharacter', 'playercharacter': 'PlayerCharacter', 'characters': 'PlayerCharacter', 'custom_spells': 'CustomSpell', 'customspell': 'CustomSpell', 'spells': 'CustomSpell', 'custom_skills': 'CustomSkill', 'customskill': 'CustomSkill', 'skills': 'CustomSkill', 'possessed_items': 'PossessedItems', 'possesseditems': 'PossessedItems', 'letter_presets': 'LetterPreset', 'letterpreset': 'LetterPreset', 'shops': 'Shop', 'shop': 'Shop', 'world_locations': 'WorldLocation', 'worldlocation': 'WorldLocation', 'npcs': 'Npc', 'npc': 'Npc', 'combats': 'Combat', 'combat': 'Combat', 'homebrew_rules': 'HomebrewRule', 'homebrewrule': 'HomebrewRule', 'rules': 'HomebrewRule', 'system_prompts': 'SystemPrompt', 'systemprompt': 'SystemPrompt', 'session_loot': 'SessionLoot', 'sessionloot': 'SessionLoot' };
        const columnMapping: Record<string, string> = { 'isArchived': 'is_archived', 'isSummarized': 'is_summarized', 'sessionNumber': 'session_number', 'xpAward': 'xp_award', 'lootScanned': 'loot_scanned', 'isRead': 'is_read', 'activeArcLabel': 'active_arc_label', 'globalCompendium': 'global_compendium' };
        db.exec("PRAGMA foreign_keys = OFF");
        try {
            db.transaction(() => {
                const existingTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((t: any) => t.name);
                for (const table of existingTables) {
                    if (table === 'sqlite_sequence' || table.startsWith('sqlite_')) continue;
                    db.prepare(`DELETE FROM ${table}`).run();
                }
                for (const [key, rows] of Object.entries(data)) {
                    const targetTable = tableMapping[key.toLowerCase()] || key;
                    if (!existingTables.includes(targetTable) || !Array.isArray(rows)) continue;
                    const tableInfo = db.prepare(`PRAGMA table_info(${targetTable})`).all() as any[];
                    const validColumns = tableInfo.map(c => c.name);
                    for (const row of rows) {
                        if (!row || typeof row !== 'object') continue;
                        const mappedRow: Record<string, any> = {};
                        for (const [colName, colVal] of Object.entries(row)) {
                            const targetCol = columnMapping[colName] || colName;
                            if (validColumns.includes(targetCol)) mappedRow[targetCol] = (colVal !== null && typeof colVal === 'object') ? (typeof colVal === 'string' ? colVal : JSON.stringify(colVal)) : colVal;
                        }
                        if (Object.keys(mappedRow).length === 0) continue;
                        const cols = Object.keys(mappedRow);
                        const placeholders = cols.map(() => '?').join(',');
                        db.prepare(`INSERT OR REPLACE INTO ${targetTable} (${cols.join(',')}) VALUES (${placeholders})`).run(...Object.values(mappedRow));
                    }
                }
                const campaigns = db.prepare("SELECT id FROM Campaign").all() as {id: string}[];
                for (const campaign of campaigns) {
                    let activeArc = db.prepare("SELECT id FROM StoryArc WHERE campaignId = ? AND status = 'active'").get(campaign.id) as {id: string};
                    if (!activeArc) {
                        const arcId = randomUUID();
                        db.prepare("INSERT INTO StoryArc (id, campaignId, title, status, order_index) VALUES (?, ?, 'Atto Iniziale', 'active', 0)").run(arcId, campaign.id);
                        activeArc = { id: arcId };
                    }
                    db.prepare("UPDATE Session SET arcId = ? WHERE campaignId = ? AND (arcId IS NULL OR arcId = '')").run(activeArc.id, campaign.id);
                }
            })();
        } finally { db.exec("PRAGMA foreign_keys = ON"); }
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function toggleItemPossession(campaignId: string, itemName: string) {
    try {
        const existing = db.prepare("SELECT * FROM PossessedItems WHERE campaignId = ? AND itemName = ?").get(campaignId, itemName);
        if (existing) db.prepare("DELETE FROM PossessedItems WHERE campaignId = ? AND itemName = ?").run(campaignId, itemName);
        else db.prepare("INSERT INTO PossessedItems (campaignId, itemName) VALUES (?, ?)").run(campaignId, itemName);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function saveLetterPreset(name: string, settings: string) {
    try {
        db.prepare("INSERT INTO LetterPreset (id, name, settings) VALUES (?, ?, ?)").run(randomUUID(), name, settings);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function deleteLetterPreset(id: string) {
    try {
        db.prepare("DELETE FROM LetterPreset WHERE id = ?").run(id);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function uploadCardBackground(imageData: string, target: string) {
    try {
        const b64 = imageData.replace(/^data:image\/\w+;base64,/, "");
        const buf = Buffer.from(b64, 'base64');
        const dir = getAssetDir();
        fs.writeFileSync(path.join(dir, target), buf);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function quickSaveRewardAction(campaignId: string, name: string, description: string) {
    try {
        db.prepare(`INSERT INTO Reward (id, campaignId, sessionId, name, description) VALUES (?, ?, 'manual', ?, ?)`).run(randomUUID(), campaignId, name, description);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function updateReward(reward: any) {
    try {
        db.prepare("UPDATE Reward SET name = ?, description = ? WHERE id = ?").run(reward.name, reward.description, reward.id);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function deleteReward(id: string) {
    try {
        db.prepare("DELETE FROM Reward WHERE id = ?").run(id);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function saveShop(data: any) {
    try {
        const id = data.id || randomUUID();
        const now = new Date().toISOString();
        db.prepare(`INSERT INTO Shop (id, campaignId, name, owner, description, inventory, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, owner=excluded.owner, description=excluded.description, inventory=excluded.inventory, updatedAt=excluded.updatedAt`).run(id, data.campaignId, data.name, data.owner, data.description, data.inventory, now, now);
        return actionResponse({ id });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function deleteShop(id: string) {
    try {
        db.prepare("DELETE FROM Shop WHERE id = ?").run(id);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function saveWorldLocation(data: any) {
    try {
        const id = data.id || randomUUID();
        const now = new Date().toISOString();
        db.prepare(`INSERT INTO WorldLocation (id, campaignId, name, scale, style, atmosphere, details, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, scale=excluded.scale, style=excluded.style, atmosphere=excluded.atmosphere, details=excluded.details, updatedAt=excluded.updatedAt`).run(id, data.campaignId, data.name, data.scale, data.style, data.atmosphere, data.details, now, now);
        return actionResponse({ id });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function deleteWorldLocation(id: string) {
    try {
        db.prepare("DELETE FROM WorldLocation WHERE id = ?").run(id);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function saveNpc(data: any) {
    try {
        const id = data.id || randomUUID();
        const now = new Date().toISOString();
        db.prepare(`INSERT INTO Npc (id, campaignId, name, race, gender, age, status, alignment, details, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, race=excluded.race, gender=excluded.gender, age=excluded.age, status=excluded.status, alignment=excluded.alignment, details=excluded.details, updatedAt=excluded.updatedAt`).run(id, data.campaignId, data.name, data.race, data.gender, data.age, data.status, data.alignment, data.details, now, now);
        return actionResponse({ id });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function deleteNpc(id: string) {
    try {
        db.prepare("DELETE FROM Npc WHERE id = ?").run(id);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function saveCombat(data: any) {
    try {
        const id = data.id || randomUUID();
        const now = new Date().toISOString();
        db.prepare(`INSERT INTO Combat (id, campaignId, name, difficulty, details, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, difficulty=excluded.difficulty, details=excluded.details, updatedAt=excluded.updatedAt`).run(id, data.campaignId, data.name, data.difficulty, data.details, now, now);
        return actionResponse({ id });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function deleteCombat(id: string) {
    try {
        db.prepare("DELETE FROM Combat WHERE id = ?").run(id);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function importSession(notes: string, title: string, campaignId: string, session_number: number) {
    try {
        const activeArc = db.prepare("SELECT id FROM StoryArc WHERE campaignId = ? AND status = 'active'").get(campaignId) as { id: string };
        const id = randomUUID();
        const now = new Date().toISOString();
        db.prepare(`INSERT INTO Session (id, session_number, title, notes, source, campaignId, arcId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, session_number, title || `Sessione ${session_number}`, notes, 'imported', campaignId, activeArc.id, now, now);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function migrateOldCharacters(campaignId: string, oldData: string) {
  try {
    const chars = JSON.parse(oldData);
    db.transaction(() => {
      const now = new Date().toISOString();
      for (const char of chars) {
        const id = char.id || randomUUID();
        db.prepare(`INSERT OR IGNORE INTO PlayerCharacter (id, campaignId, name, class, archetype, level, hitPoints, armorClass, strength, dexterity, constitution, intelligence, wisdom, charisma, background, imageUrl, spells, traits, ideals, bonds, flaws, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, campaignId, char.name, char.class, char.archetype, char.level, char.hitPoints, char.armorClass, char.strength, char.dexterity, char.constitution, char.intelligence, char.wisdom, char.charisma, char.background, char.imageUrl, char.spells, char.traits, char.ideals, char.bonds, char.flaws, now, now);
      }
    })();
    return actionResponse({ success: true });
  } catch (e: any) { return actionResponse(null, e.message); }
}
