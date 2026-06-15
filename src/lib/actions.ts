
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

// --- UTILITY PERCORSI PERSISTENTI ---

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

export async function deleteAssetAction(filename: string) {
    try {
        const assetDir = getAssetDir();
        const filePath = path.join(assetDir, filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return actionResponse({ success: true });
        }
        return actionResponse(null, "File non trovato.");
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
}

function deleteAssetFile(imageUrl: string | null | undefined) {
    if (!imageUrl || !imageUrl.startsWith('/api/assets/')) return;
    try {
        const filename = imageUrl.replace('/api/assets/', '').split('?')[0];
        const assetDir = getAssetDir();
        const filePath = path.join(assetDir, filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (e) {
        console.error("[Cleanup] Error deleting file:", e);
    }
}

export async function listAssetsAction() {
    try {
        const dir = getAssetDir();
        if (!fs.existsSync(dir)) return actionResponse([]);
        const files = fs.readdirSync(dir);
        const stats = files.map(f => {
            const filePath = path.join(dir, f);
            const s = fs.statSync(filePath);
            return {
                name: f,
                size: s.size,
                createdAt: s.mtime.toISOString(),
                url: `/api/assets/${f}`
            };
        });
        stats.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return actionResponse(stats);
    } catch (e: any) {
        return actionResponse(null, e.message);
    }
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

// --- ADAPTIVE DB HELPERS ---
function getTableCols(tableName: string) {
    try {
        return (db.prepare(`PRAGMA table_info(${tableName})`).all() as any[]).map(c => c.name.toLowerCase());
    } catch (e) {
        return [];
    }
}

// --- AZIONI CAMPAGNA ---

export async function createCampaign(data: { name: string; setting: string; description?: string | null; }) {
    try {
        const campaignId = randomUUID();
        const arcId = randomUUID();
        const now = new Date().toISOString();
        const campaignCols = getTableCols('Campaign');
        const hasCampaignDates = campaignCols.includes('createdat');

        db.transaction(() => {
            if (hasCampaignDates) {
                db.prepare(`INSERT INTO Campaign (id, name, setting, description, summary, active_arc_label, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(campaignId, data.name, data.setting, data.description || null, "In attesa di inizializzazione...", "Arco Narrativo Attivo", now, now);
            } else {
                db.prepare(`INSERT INTO Campaign (id, name, setting, description, summary, active_arc_label) VALUES (?, ?, ?, ?, ?, ?)`).run(campaignId, data.name, data.setting, data.description || null, "In attesa di inizializzazione...", "Arco Narrativo Attivo");
            }
            db.prepare(`INSERT INTO StoryArc (id, campaignId, title, status, order_index, createdAt, updatedAt) VALUES (?, ?, ?, 'active', 0, ?, ?)`).run(arcId, campaignId, "Atto Iniziale", now, now);
        })();
        return actionResponse({ campaign: { id: campaignId }, progress: "La tua cronaca è stata creata correttamente!" });
    } catch (error: any) { return actionResponse(null, `Errore Salvataggio: ${error.message}`); }
}

export async function updateCampaignInfo(campaignId: string, name: string, setting: string) {
    try {
        const campaignCols = getTableCols('Campaign');
        const hasUpdatedAt = campaignCols.includes('updatedat');
        if (hasUpdatedAt) {
            db.prepare("UPDATE Campaign SET name = ?, setting = ?, updatedAt = ? WHERE id = ?").run(name, setting, new Date().toISOString(), campaignId);
        } else {
            db.prepare("UPDATE Campaign SET name = ?, setting = ? WHERE id = ?").run(name, setting, campaignId);
        }
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function deleteCampaign(campaignId: string) {
    try {
        const pcs = db.prepare("SELECT imageUrl FROM PlayerCharacter WHERE campaignId = ?").all(campaignId) as { imageUrl: string }[];
        pcs.forEach(pc => deleteAssetFile(pc.imageUrl));
        
        const npcs = db.prepare("SELECT details FROM Npc WHERE campaignId = ?").all(campaignId) as { details: string }[];
        npcs.forEach(npc => {
            const d = JSON.parse(npc.details);
            deleteAssetFile(d.imageUrl);
        });

        const items = db.prepare("SELECT imageUrl FROM MagicItem WHERE campaignId = ?").all(campaignId) as { imageUrl: string }[];
        items.forEach(i => deleteAssetFile(i.imageUrl));

        const monsters = db.prepare("SELECT imageUrl FROM Monster WHERE campaignId = ?").all(campaignId) as { imageUrl: string }[];
        monsters.forEach(m => deleteAssetFile(m.imageUrl));

        db.prepare("DELETE FROM Campaign WHERE id = ?").run(campaignId);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function initializeAiSummary(campaignId: string) {
    try {
        const campaign = db.prepare("SELECT * FROM Campaign WHERE id = ?").get(campaignId) as Campaign;
        if (!campaign) throw new Error("Campagna non trovata.");
        const aiResult = await runAiWithRetry(() => initializeCampaignFlow({ campaignName: campaign.name, setting: campaign.setting, description: campaign.description || undefined }), 'STORY');
        const campaignCols = getTableCols('Campaign');
        const hasUpdatedAt = campaignCols.includes('updatedat');
        if (hasUpdatedAt) {
            db.prepare("UPDATE Campaign SET summary = ?, updatedAt = ? WHERE id = ?").run(aiResult.initial_summary, new Date().toISOString(), campaignId);
        } else {
            db.prepare("UPDATE Campaign SET summary = ? WHERE id = ?").run(aiResult.initial_summary, campaignId);
        }
        return actionResponse({ summary: aiResult.initial_summary });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function summarizeCampaign(campaignId: string) {
    try {
        const sessions = db.prepare("SELECT session_number, title, notes FROM Session WHERE campaignId = ? AND is_archived = 0 ORDER BY session_number ASC").all(campaignId) as any[];
        if (sessions.length === 0) return actionResponse({ success: true });
        const history = sessions.map(s => `Sessione ${s.session_number}: ${s.title}\n${s.notes}`).join('\n---\n');
        const override = await getSystemOverride('summary-campaign');
        const result = await runAiWithRetry(() => summarizeCampaignFlow({ campaignHistory: history, systemOverride: override }), 'SUMMARY');
        const campaignCols = getTableCols('Campaign');
        const hasUpdatedAt = campaignCols.includes('updatedat');
        if (hasUpdatedAt) {
            db.prepare("UPDATE Campaign SET summary = ?, updatedAt = ? WHERE id = ?").run(result.summary, new Date().toISOString(), campaignId);
        } else {
            db.prepare("UPDATE Campaign SET summary = ? WHERE id = ?").run(result.summary, campaignId);
        }
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
        
        const campaignCols = getTableCols('Campaign');
        const hasCampaignUpdatedAt = campaignCols.includes('updatedat');

        db.transaction(() => {
            const now = new Date().toISOString();
            db.prepare("UPDATE StoryArc SET title = ?, summary = ?, world_impact = ?, updatedAt = ? WHERE id = ?").run(result.newTitle, result.summary, result.worldImpact, now, arcId);
            const updateSession = db.prepare("UPDATE Session SET is_summarized = 1, updatedAt = ? WHERE id = ?");
            sessionIds.forEach(id => updateSession.run(now, id));
            
            if (arc.status === 'active') {
                if (hasCampaignUpdatedAt) {
                    db.prepare("UPDATE Campaign SET summary = ?, updatedAt = ? WHERE id = ?").run(result.summary, now, arc.campaignId);
                } else {
                    db.prepare("UPDATE Campaign SET summary = ? WHERE id = ?").run(result.summary, arc.campaignId);
                }
            }
            
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
        const campaignCols = getTableCols('Campaign');
        const hasCampaignUpdatedAt = campaignCols.includes('updatedat');

        db.transaction(() => {
            if (arc.status === 'active') {
                db.prepare("UPDATE StoryArc SET summary = NULL, world_impact = NULL, updatedAt = ? WHERE id = ?").run(now, arcId);
                db.prepare("UPDATE Session SET is_summarized = 0, updatedAt = ? WHERE arcId = ?").run(now, arcId);
                if (hasCampaignUpdatedAt) {
                    db.prepare("UPDATE Campaign SET summary = NULL, updatedAt = ? WHERE id = ?").run(now, campaignId);
                } else {
                    db.prepare("UPDATE Campaign SET summary = NULL WHERE id = ?").run(campaignId);
                }
            } else {
                const activeArc = db.prepare("SELECT id FROM StoryArc WHERE campaignId = ? AND status = 'active'").get(campaignId) as { id: string };
                if (activeArc) db.prepare("UPDATE Session SET arcId = ?, is_archived = 0, is_summarized = 0, updatedAt = ? WHERE arcId = ?").run(activeArc.id, now, arcId);
                db.prepare("DELETE FROM StoryArc WHERE id = ?").run(arcId);
            }
            const allRemaining = db.prepare("SELECT title, summary, world_impact FROM StoryArc WHERE campaignId = ? AND status = 'archived' AND summary IS NOT NULL ORDER BY order_index ASC").all(campaignId) as any[];
            const newCompendium = allRemaining.length > 0 ? allRemaining.map(a => `### ${a.title}\n${a.summary}\n\n**Impatto:**\n${a.world_impact || 'Nessuna nota.'}`).join('\n\n---\n\n') : null;
            if (hasCampaignUpdatedAt) {
                db.prepare("UPDATE Campaign SET global_compendium = ?, updatedAt = ? WHERE id = ?").run(newCompendium, now, campaignId);
            } else {
                db.prepare("UPDATE Campaign SET global_compendium = ? WHERE id = ?").run(newCompendium, campaignId);
            }
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

// --- AZIONI SESSIONI (ADAPTIVE) ---

export async function confirmSession(sessionData: any, campaignId: string) {
    try {
        const activeArc = db.prepare("SELECT id FROM StoryArc WHERE campaignId = ? AND status = 'active'").get(campaignId) as { id: string };
        const id = randomUUID();
        const now = new Date().toISOString();
        
        const cols = getTableCols('Session');
        const data: Record<string, any> = {
            id,
            session_number: sessionData.session_number,
            title: sessionData.title,
            notes: sessionData.notes,
            xp_award: sessionData.xp_award || 0,
            source: sessionData.source,
            campaignId,
            arcId: activeArc?.id || null,
            createdAt: now,
            updatedAt: now,
            is_read: 0,
            loot_scanned: 0,
            is_archived: 0,
            is_summarized: 0
        };

        const insertCols = Object.keys(data).filter(c => cols.includes(c.toLowerCase()));
        const placeholders = insertCols.map(() => '?').join(',');
        const values = insertCols.map(c => data[c]);

        db.prepare(`INSERT INTO Session (${insertCols.join(',')}) VALUES (${placeholders})`).run(...values);
        return actionResponse({ id });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function importSession(notes: string, title: string, campaignId: string, session_number: number) {
    try {
        const activeArc = db.prepare("SELECT id FROM StoryArc WHERE campaignId = ? AND status = 'active'").get(campaignId) as { id: string };
        const id = randomUUID();
        const now = new Date().toISOString();
        
        const cols = getTableCols('Session');
        const data: Record<string, any> = {
            id,
            session_number,
            title: title || `Sessione ${session_number}`,
            notes,
            source: 'imported',
            campaignId,
            arcId: activeArc?.id || null,
            createdAt: now,
            updatedAt: now,
            is_read: 0,
            loot_scanned: 0,
            is_archived: 0,
            is_summarized: 0
        };

        const insertCols = Object.keys(data).filter(c => cols.includes(c.toLowerCase()));
        const placeholders = insertCols.map(() => '?').join(',');
        const values = insertCols.map(c => data[c]);

        db.prepare(`INSERT INTO Session (${insertCols.join(',')}) VALUES (${placeholders})`).run(...values);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

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

export async function updateSessionMetadata(sessionId: string, title: string, num: number) {
    try {
        const cols = getTableCols('Session');
        const now = new Date().toISOString();
        let query = "UPDATE Session SET title = ?, session_number = ?";
        const params = [title, num];
        if (cols.includes('updatedat')) {
            query += ", updatedAt = ?";
            params.push(now);
        }
        query += " WHERE id = ?";
        params.push(sessionId);
        db.prepare(query).run(...params);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function updateSessionTitle(sessionId: string, title: string) {
    try {
        const cols = getTableCols('Session');
        let query = "UPDATE Session SET title = ?";
        const params = [title];
        if (cols.includes('updatedat')) {
            query += ", updatedAt = ?";
            params.push(new Date().toISOString());
        }
        query += " WHERE id = ?";
        params.push(sessionId);
        db.prepare(query).run(...params);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function updateSessionNumber(sessionId: string, num: number) {
    try {
        const cols = getTableCols('Session');
        let query = "UPDATE Session SET session_number = ?";
        const params = [num];
        if (cols.includes('updatedat')) {
            query += ", updatedAt = ?";
            params.push(new Date().toISOString());
        }
        query += " WHERE id = ?";
        params.push(sessionId);
        db.prepare(query).run(...params);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function updateSessionNotes(sessionId: string, newNotes: string) {
    try {
        const cols = getTableCols('Session');
        let query = "UPDATE Session SET notes = ?";
        const params = [newNotes];
        if (cols.includes('updatedat')) {
            query += ", updatedAt = ?";
            params.push(new Date().toISOString());
        }
        query += " WHERE id = ?";
        params.push(sessionId);
        db.prepare(query).run(...params);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function updateSessionXp(sessionId: string, xp: number) {
    try {
        const cols = getTableCols('Session');
        let query = "UPDATE Session SET xp_award = ?";
        const params = [xp];
        if (cols.includes('updatedat')) {
            query += ", updatedAt = ?";
            params.push(new Date().toISOString());
        }
        query += " WHERE id = ?";
        params.push(sessionId);
        db.prepare(query).run(...params);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function toggleSessionReadStatus(sessionId: string) {
    try {
        const cols = getTableCols('Session');
        let query = "UPDATE Session SET is_read = NOT is_read";
        const params = [];
        if (cols.includes('updatedat')) {
            query += ", updatedAt = ?";
            params.push(new Date().toISOString());
        }
        query += " WHERE id = ?";
        params.push(sessionId);
        db.prepare(query).run(...params);
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
            const cols = getTableCols('Session');
            const hasUpdatedAt = cols.includes('updatedat');
            let query = "UPDATE Session SET session_number = ?";
            if (hasUpdatedAt) query += ", updatedAt = ?";
            query += " WHERE id = ?";
            const updateStmt = db.prepare(query);
            orderedIds.forEach((id, idx) => {
                const params = [sortedNumbers[idx]];
                if (hasUpdatedAt) params.push(now);
                params.push(id);
                updateStmt.run(...params);
            });
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
        
        const arcCols = getTableCols('StoryArc');
        const sessCols = getTableCols('Session');
        const campaignCols = getTableCols('Campaign');

        db.transaction(() => {
            // Update StoryArc
            let arcQuery = "UPDATE StoryArc SET status = 'archived', summary = ?";
            const arcParams = [campaign.summary];
            if (arcCols.includes('updatedat')) { arcQuery += ", updatedAt = ?"; arcParams.push(now); }
            arcQuery += " WHERE id = ?"; arcParams.push(arcId);
            db.prepare(arcQuery).run(...arcParams);

            // Update Session
            let sessQuery = "UPDATE Session SET is_archived = 1";
            const sessParams = [];
            if (sessCols.includes('updatedat')) { sessQuery += ", updatedAt = ?"; sessParams.push(now); }
            sessQuery += " WHERE arcId = ?"; sessParams.push(arcId);
            db.prepare(sessQuery).run(...sessParams);

            // Update Campaign
            let campQuery = "UPDATE Campaign SET summary = NULL";
            const campParams: any[] = [];
            if (campaignCols.includes('updatedat')) { campQuery += ", updatedAt = ?"; campParams.push(now); }
            campQuery += " WHERE id = ?"; campParams.push(campaignId);
            db.prepare(campQuery).run(...campParams);

            // Insert New Arc (Adaptive)
            const newArcD: Record<string, any> = { id: newArcId, campaignId, title: 'Nuovo Capitolo', status: 'active', order_index: 1, createdat: now, updatedat: now };
            const insArcCols = Object.keys(newArcD).filter(c => arcCols.includes(c.toLowerCase()));
            db.prepare(`INSERT INTO StoryArc (${insArcCols.join(',')}) VALUES (${insArcCols.map(() => '?').join(',')})`).run(...insArcCols.map(c => newArcD[c]));

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
        const cols = getTableCols('Session');
        let query = "UPDATE Session SET is_archived = 1";
        const params = [];
        if (cols.includes('updatedat')) {
            query += ", updatedAt = ?";
            params.push(now);
        }
        query += " WHERE id = ?";
        params.push(sessionId);
        db.prepare(query).run(...params);
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
            
            // MAGIC ITEMS (ADAPTIVE)
            const magicItemCols = getTableCols('MagicItem');
            for (const item of entities.newMagicItems) {
                const d: Record<string, any> = { id: randomUUID(), name: item.name, type: item.type, rarity: item.rarity, attunement: item.attunement || 'No', description: item.description, cost: item.cost || 'N/D', damage: item.damage || '', techType: 'damage', imageUrl: null, campaignId: session.campaignId, createdAt: now, updatedAt: now };
                const insertCols = Object.keys(d).filter(c => magicItemCols.includes(c.toLowerCase()));
                const placeholders = insertCols.map(() => '?').join(',');
                const updateSet = insertCols.filter(c => !['id', 'name', 'campaignid', 'createdat'].includes(c.toLowerCase())).map(c => `${c}=excluded.${c}`).join(', ');
                db.prepare(`INSERT INTO MagicItem (${insertCols.join(',')}) VALUES (${placeholders}) ON CONFLICT(name, campaignId) DO UPDATE SET ${updateSet}`).run(...insertCols.map(c => d[c]));
                const actual = db.prepare("SELECT id FROM MagicItem WHERE name = ? AND campaignId = ?").get(item.name, session.campaignId) as { id: string };
                if (actual) db.prepare(`INSERT OR IGNORE INTO SessionLoot (sessionId, entityId, entityType) VALUES (?, ?, 'item')`).run(sessionId, actual.id);
            }

            // MONSTERS (ADAPTIVE)
            const monsterCols = getTableCols('Monster');
            for (const m of entities.newMonsters) {
                const d: Record<string, any> = { id: randomUUID(), name: m.name, type: m.type, armorClass: m.armorClass, hitPoints: m.hitPoints, challenge: m.challenge, description: m.description, imageUrl: null, campaignId: session.campaignId, createdAt: now, updatedAt: now };
                const insertCols = Object.keys(d).filter(c => monsterCols.includes(c.toLowerCase()));
                const placeholders = insertCols.map(() => '?').join(',');
                const updateSet = insertCols.filter(c => !['id', 'name', 'campaignid', 'createdat'].includes(c.toLowerCase())).map(c => `${c}=excluded.${c}`).join(', ');
                db.prepare(`INSERT INTO Monster (${insertCols.join(',')}) VALUES (${placeholders}) ON CONFLICT(name, campaignId) DO UPDATE SET ${updateSet}`).run(...insertCols.map(c => d[c]));
                const actual = db.prepare("SELECT id FROM Monster WHERE name = ? AND campaignId = ?").get(m.name, session.campaignId) as { id: string };
                if (actual) db.prepare(`INSERT OR IGNORE INTO SessionLoot (sessionId, entityId, entityType) VALUES (?, ?, 'monster')`).run(sessionId, actual.id);
            }

            // REWARDS (ADAPTIVE)
            const rewardCols = getTableCols('Reward');
            for (const r of entities.rewards) {
                const d: Record<string, any> = { id: randomUUID(), campaignId: session.campaignId, sessionId, name: r.name, description: r.description, createdAt: now, updatedAt: now };
                const insertCols = Object.keys(d).filter(c => rewardCols.includes(c.toLowerCase()));
                const placeholders = insertCols.map(() => '?').join(',');
                db.prepare(`INSERT INTO Reward (${insertCols.join(',')}) VALUES (${placeholders})`).run(...insertCols.map(c => d[c]));
            }
            
            // CHARACTER EVENTS (ADAPTIVE)
            const charEventCols = getTableCols('CharacterEvent');
            entities.characterEvents.forEach((event, idx) => {
                const pc = db.prepare("SELECT id FROM PlayerCharacter WHERE LOWER(name) = LOWER(?) AND campaignId = ?").get(event.name, session.campaignId) as { id: string };
                let charId = pc?.id;
                let charType: 'pc' | 'npc' = 'pc';
                if (!charId) {
                    const npc = db.prepare("SELECT id FROM Npc WHERE LOWER(name) = LOWER(?) AND campaignId = ?").get(event.name, session.campaignId) as { id: string };
                    charId = npc?.id;
                    charType = 'npc';
                    if (!charId && event.isNew) {
                        charId = randomUUID();
                        const npcD: Record<string, any> = { id: charId, campaignId: session.campaignId, name: event.name, race: 'Sconosciuta', gender: 'Maschio', age: 'Adulto', status: 'Normale', alignment: 'Neutrale', details: JSON.stringify({ name: event.name, race: 'Sconosciuta', occupation: 'Rilevato', appearance: 'Dati sensoriali in attesa di catalogo.', personality: 'Personalità da definire.', mannerism: '—', secret: 'Segreto ignoto.', encounterHook: event.event }), createdAt: now, updatedAt: now };
                        const npcCols = getTableCols('Npc');
                        const nCols = Object.keys(npcD).filter(c => npcCols.includes(c.toLowerCase()));
                        db.prepare(`INSERT INTO Npc (${nCols.join(',')}) VALUES (${nCols.map(() => '?').join(',')})`).run(...nCols.map(c => npcD[c]));
                    }
                }
                if (charId) {
                    const evD: Record<string, any> = { id: randomUUID(), characterId: charId, characterType: charType, sessionId, campaignId: session.campaignId, eventDescription: event.event, order_index: idx, createdAt: now };
                    const evCols = Object.keys(evD).filter(c => charEventCols.includes(c.toLowerCase()));
                    db.prepare(`INSERT INTO CharacterEvent (${evCols.join(',')}) VALUES (${evCols.map(() => '?').join(',')})`).run(...evCols.map(c => evD[c]));
                }
            });
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
        const characterEvents = db.prepare(`SELECT e.*, CASE WHEN e.characterType = 'pc' THEN p.name ELSE n.name END as characterName, e.characterType FROM CharacterEvent e LEFT JOIN PlayerCharacter p ON e.characterId = p.id AND e.characterType = 'pc' LEFT JOIN Npc n ON e.characterId = n.id AND e.characterType = 'npc' WHERE e.sessionId = ? ORDER BY e.order_index ASC`).all(sessionId) as any[];
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
          const labels: Record<string, string> = { 'dicerie': 'nuowe dicerie e segreti locali', 'conseguenze': 'conseguenze impreviste alle ultime azioni dei giocatori', 'clima': 'dettagli sull\'atmosfera, il meteo e le sensazioni ambientali', 'incontri': 'piccoli incontri casuali o interazioni con la folla', 'nomi': 'una lista di nomi evocativi per persone o luoghi' };
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
        const history = db.prepare(`SELECT e.eventDescription, s.session_number FROM CharacterEvent e JOIN Session s ON e.sessionId = s.id WHERE e.characterId = ? AND e.characterType = 'npc' ORDER BY s.session_number ASC, e.order_index ASC`).all(npcId) as any[];
        const historyText = history.length > 0 ? history.map(h => `Sess ${h.session_number}: ${h.eventDescription}`).join('\n') : "Nessuna azione registrata nelle sessioni finora.";
        const override = await getSystemOverride('npc-gen');
        const data = await runAiWithRetry(() => updateNpcIdentityFlow({ npcName: npc.name, npcRace: npc.race, history: historyText, campaignSummary: campaign.summary || undefined, systemOverride: override }), 'WORLD');
        
        const oldDetails = JSON.parse(npc.details);
        if (oldDetails.imageUrl && oldDetails.imageUrl !== data.imageUrl) {
            deleteAssetFile(oldDetails.imageUrl);
        }

        const npcCols = getTableCols('Npc');
        const hasUpdatedAt = npcCols.includes('updatedat');

        if (hasUpdatedAt) {
            db.prepare(`UPDATE Npc SET name = ?, race = ?, gender = ?, age = ?, status = ?, alignment = ?, details = ?, updatedAt = ? WHERE id = ?`).run(data.name, data.race, data.gender, data.age, data.status, data.alignment, JSON.stringify(data), new Date().toISOString(), npcId);
        } else {
            db.prepare(`UPDATE Npc SET name = ?, race = ?, gender = ?, age = ?, status = ?, alignment = ?, details = ? WHERE id = ?`).run(data.name, data.race, data.gender, data.age, data.status, data.alignment, JSON.stringify(data), npcId);
        }
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
        
        const npcCols = getTableCols('Npc');
        const hasUpdatedAt = npcCols.includes('updatedat');
        const charEventCols = getTableCols('CharacterEvent');
        const hasCharEventDate = charEventCols.includes('createdat');
        const hasCharEventOrder = charEventCols.includes('order_index');

        db.transaction(() => {
            const now = new Date().toISOString();
            
            const oldDetails = JSON.parse(npc.details);
            if (oldDetails.imageUrl && oldDetails.imageUrl !== result.identity.imageUrl) {
                deleteAssetFile(oldDetails.imageUrl);
            }

            db.prepare("DELETE FROM CharacterEvent WHERE characterId = ? AND characterType = 'npc'").run(npcId);
            result.events.forEach((ev, idx) => {
                const sess = db.prepare("SELECT id FROM Session WHERE session_number = ? AND campaignId = ?").get(ev.sessionNumber, campaignId) as { id: string };
                if (sess) {
                    const cols = ["id", "characterId", "characterType", "sessionId", "campaignId", "eventDescription"];
                    const vals = [randomUUID(), npcId, 'npc', sess.id, campaignId, ev.eventDescription];
                    if (hasCharEventOrder) { cols.push("order_index"); vals.push(idx); }
                    if (hasCharEventDate) { cols.push("createdAt"); vals.push(now); }
                    const placeholders = cols.map(() => '?').join(',');
                    db.prepare(`INSERT INTO CharacterEvent (${cols.join(',')}) VALUES (${placeholders})`).run(...vals);
                }
            });
            
            if (hasUpdatedAt) {
                db.prepare(`UPDATE Npc SET name = ?, race = ?, gender = ?, age = ?, status = ?, alignment = ?, details = ?, updatedAt = ? WHERE id = ?`).run(result.identity.name, result.identity.race, result.identity.gender, result.identity.age, result.identity.status, result.identity.alignment, JSON.stringify(result.identity), now, npcId);
            } else {
                db.prepare(`UPDATE Npc SET name = ?, race = ?, gender = ?, age = ?, status = ?, alignment = ?, details = ? WHERE id = ?`).run(result.identity.name, result.identity.race, result.identity.gender, result.identity.age, result.identity.status, result.identity.alignment, JSON.stringify(result.identity), npcId);
            }
        })();
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

// --- AZIONI CRUD DATABASE (ADAPTIVE) ---

export async function saveMagicItem(item: Partial<MagicItem> & { campaignId: string }) {
    try {
        const id = item.id || randomUUID();
        const now = new Date().toISOString();
        
        if (item.id) {
            const existing = db.prepare("SELECT imageUrl FROM MagicItem WHERE id = ?").get(item.id) as { imageUrl: string };
            if (existing && existing.imageUrl && existing.imageUrl !== item.imageUrl) {
                deleteAssetFile(existing.imageUrl);
            }
        }

        const magicItemCols = getTableCols('MagicItem');
        const d: Record<string, any> = { id, name: item.name, type: item.type, rarity: item.rarity, attunement: item.attunement || 'No', description: item.description, cost: item.cost || 'N/D', damage: item.damage || '', techType: item.techType || 'damage', imageUrl: item.imageUrl || null, campaignId: item.campaignId, createdAt: item.createdAt || now, updatedAt: now };
        const insertCols = Object.keys(d).filter(c => magicItemCols.includes(c.toLowerCase()));
        const placeholders = insertCols.map(() => '?').join(',');
        const updateSet = insertCols.filter(c => !['id', 'name', 'campaignid', 'createdat'].includes(c.toLowerCase())).map(c => `${c}=excluded.${c}`).join(', ');
        db.prepare(`INSERT INTO MagicItem (${insertCols.join(',')}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updateSet}`).run(...insertCols.map(c => d[c]));
        return actionResponse({ id });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function deleteMagicItem(id: string) {
    try {
        const item = db.prepare("SELECT imageUrl FROM MagicItem WHERE id = ?").get(id) as { imageUrl: string };
        if (item) deleteAssetFile(item.imageUrl);
        db.prepare("DELETE FROM MagicItem WHERE id = ?").run(id);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function saveMonster(monster: Partial<Monster> & { campaignId: string }) {
    try {
        const id = monster.id || randomUUID();
        const now = new Date().toISOString();

        if (monster.id) {
            const existing = db.prepare("SELECT imageUrl FROM Monster WHERE id = ?").get(monster.id) as { imageUrl: string };
            if (existing && existing.imageUrl && existing.imageUrl !== monster.imageUrl) {
                deleteAssetFile(existing.imageUrl);
            }
        }

        const monsterCols = getTableCols('Monster');
        const d: Record<string, any> = { id, name: monster.name, type: monster.type, armorClass: monster.armorClass, hitPoints: monster.hitPoints, challenge: monster.challenge, description: monster.description, imageUrl: monster.imageUrl || null, campaignId: monster.campaignId, createdAt: monster.createdAt || now, updatedAt: now };
        const insertCols = Object.keys(d).filter(c => monsterCols.includes(c.toLowerCase()));
        const placeholders = insertCols.map(() => '?').join(',');
        const updateSet = insertCols.filter(c => !['id', 'name', 'campaignid', 'createdat'].includes(c.toLowerCase())).map(c => `${c}=excluded.${c}`).join(', ');
        db.prepare(`INSERT INTO Monster (${insertCols.join(',')}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updateSet}`).run(...insertCols.map(c => d[c]));
        return actionResponse({ id });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function deleteMonster(id: string) {
    try {
        const m = db.prepare("SELECT imageUrl FROM Monster WHERE id = ?").get(id) as { imageUrl: string };
        if (m) deleteAssetFile(m.imageUrl);
        db.prepare("DELETE FROM Monster WHERE id = ?").run(id);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function saveSpell(spell: Partial<Spell> & { campaignId: string }) {
    try {
        const id = spell.id || randomUUID();
        const now = new Date().toISOString();
        const spellCols = getTableCols('CustomSpell');
        const d: Record<string, any> = { id, name: spell.name, level: spell.level, school: spell.school, casting_time: spell.casting_time, range: spell.range, components: spell.components, duration: spell.duration, description: spell.description, classes: spell.classes, campaignId: spell.campaignId, createdAt: spell.createdAt || now, updatedAt: now };
        const insertCols = Object.keys(d).filter(c => spellCols.includes(c.toLowerCase()));
        const placeholders = insertCols.map(() => '?').join(',');
        const updateSet = insertCols.filter(c => !['id', 'name', 'campaignid', 'createdat'].includes(c.toLowerCase())).map(c => `${c}=excluded.${c}`).join(', ');
        db.prepare(`INSERT INTO CustomSpell (${insertCols.join(',')}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updateSet}`).run(...insertCols.map(c => d[c]));
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
        const skillCols = getTableCols('CustomSkill');
        const d: Record<string, any> = { id, name: skill.name, ability: skill.ability, description: skill.description, campaignId: skill.campaignId, createdAt: skill.createdAt || now, updatedAt: now };
        const insertCols = Object.keys(d).filter(c => skillCols.includes(c.toLowerCase()));
        const placeholders = insertCols.map(() => '?').join(',');
        const updateSet = insertCols.filter(c => !['id', 'name', 'campaignid', 'createdat'].includes(c.toLowerCase())).map(c => `${c}=excluded.${c}`).join(', ');
        db.prepare(`INSERT INTO CustomSkill (${insertCols.join(',')}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updateSet}`).run(...insertCols.map(c => d[c]));
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
        const now = new Date().toISOString();
        
        db.transaction(() => {
            if (data.items) {
                const cols = getTableCols('MagicItem');
                const s = db.prepare(`INSERT OR IGNORE INTO MagicItem (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
                for (const it of data.items) {
                    const d: Record<string, any> = { id: randomUUID(), campaignId, name: it.name, type: it.type || 'Oggetto', rarity: it.rarity || 'Comune', attunement: it.attunement || 'No', description: it.description || '', cost: it.cost || 'N/D', damage: it.damage || '', createdat: now, updatedat: now };
                    s.run(...cols.map(c => d[c.toLowerCase()]));
                    count++;
                }
            }
            if (data.monsters) {
                const cols = getTableCols('Monster');
                const s = db.prepare(`INSERT OR IGNORE INTO Monster (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
                for (const m of data.monsters) {
                    const d: Record<string, any> = { id: randomUUID(), campaignId, name: m.name, type: m.type || 'Mostro', armorclass: m.armorClass || '10', hitpoints: m.hitPoints || '10', challenge: m.challenge || '0', description: m.description || '', createdat: now, updatedat: now };
                    s.run(...cols.map(c => d[c.toLowerCase()]));
                    count++;
                }
            }
            if (data.spells) {
                const cols = getTableCols('CustomSpell');
                const s = db.prepare(`INSERT OR IGNORE INTO CustomSpell (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
                for (const spell of data.spells) {
                    const d: Record<string, any> = { id: randomUUID(), campaignId, name: spell.name, level: spell.level || '0', school: spell.school || 'Univ', casting_time: spell.casting_time || '1 az', range: spell.range || 'Contatto', components: spell.components || 'V, S', duration: spell.duration || 'Ist', description: spell.description || '', classes: spell.classes || '', createdat: now, updatedat: now };
                    s.run(...cols.map(c => d[c.toLowerCase()]));
                    count++;
                }
            }
            if (data.skills) {
                const cols = getTableCols('CustomSkill');
                const s = db.prepare(`INSERT OR IGNORE INTO CustomSkill (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
                for (const sk of data.skills) {
                    const d: Record<string, any> = { id: randomUUID(), campaignId, name: sk.name, ability: sk.ability || 'Varia', description: sk.description || '', createdat: now, updatedat: now };
                    s.run(...cols.map(c => d[c.toLowerCase()]));
                    count++;
                }
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
        const cols = getTableCols('HomebrewRule');
        const d: Record<string, any> = { id, campaignId: data.campaignId, title: data.title, content: data.content, category: data.category || 'Generale', isActive: data.isActive ? 1 : 0, createdAt: data.createdAt || now, updatedAt: now };
        const insertCols = Object.keys(d).filter(c => cols.includes(c.toLowerCase()));
        const placeholders = insertCols.map(() => '?').join(',');
        db.prepare(`INSERT INTO HomebrewRule (${insertCols.join(',')}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET title=excluded.title, content=excluded.content, category=excluded.category, isActive=excluded.isActive, updatedAt=excluded.updatedAt`).run(...insertCols.map(c => d[c]));
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
        const ruleCols = getTableCols('HomebrewRule');
        const hasUpdatedAt = ruleCols.includes('updatedat');
        if (hasUpdatedAt) {
            db.prepare("UPDATE HomebrewRule SET isActive = NOT isActive, updatedAt = ? WHERE id = ?").run(new Date().toISOString(), id);
        } else {
            db.prepare("UPDATE HomebrewRule SET isActive = NOT isActive WHERE id = ?").run(id);
        }
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
        
        if (pc.id) {
            const existing = db.prepare("SELECT imageUrl FROM PlayerCharacter WHERE id = ?").get(pc.id) as { imageUrl: string };
            if (existing && existing.imageUrl && existing.imageUrl !== pc.imageUrl) {
                deleteAssetFile(existing.imageUrl);
            }
        }

        const cols = getTableCols('PlayerCharacter');
        const d: Record<string, any> = { id, campaignId: pc.campaignId, name: pc.name, race: pc.race ?? null, class: pc.class ?? null, archetype: pc.archetype ?? null, level: pc.level ?? null, hitPoints: pc.hitPoints ?? null, armorClass: pc.armorClass ?? null, strength: pc.strength ?? null, dexterity: pc.dexterity ?? null, constitution: pc.constitution ?? null, intelligence: pc.intelligence ?? null, wisdom: pc.wisdom ?? null, charisma: pc.charisma ?? null, background: pc.background ?? null, imageUrl: pc.imageUrl ?? null, spells: pc.spells ?? null, traits: pc.traits ?? null, ideals: pc.ideals ?? null, bonds: pc.bonds ?? null, flaws: pc.flaws ?? null, createdAt: pc.createdAt || now, updatedAt: now };
        const insertCols = Object.keys(d).filter(c => cols.includes(c.toLowerCase()));
        const placeholders = insertCols.map(() => '?').join(',');
        const updateSet = insertCols.filter(c => !['id', 'campaignid', 'createdat'].includes(c.toLowerCase())).map(c => `${c}=excluded.${c}`).join(', ');
        db.prepare(`INSERT INTO PlayerCharacter (${insertCols.join(',')}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updateSet}`).run(...insertCols.map(c => d[c]));
        return actionResponse({ id });
    } catch (e: any) { 
        return actionResponse(null, e.message); 
    }
}

export async function deletePlayerCharacter(id: string) {
    try {
        const pc = db.prepare("SELECT imageUrl FROM PlayerCharacter WHERE id = ?").get(id) as { imageUrl: string };
        if (pc) deleteAssetFile(pc.imageUrl);
        db.prepare("DELETE FROM PlayerCharacter WHERE id = ?").run(id);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function getNpcSummary(campaignId: string) {
    try {
        const npcs = db.prepare("SELECT * FROM Npc WHERE campaignId = ? ORDER BY name ASC").all(campaignId) as Npc[];
        const enriched = npcs.map(n => {
            const details = JSON.parse(n.details) as NpcDetails;
            const last = db.prepare(`SELECT e.*, s.session_number as num, s.title FROM CharacterEvent e JOIN Session s ON e.sessionId = s.id WHERE e.characterId = ? AND e.characterType = 'npc' ORDER BY s.session_number DESC, e.order_index DESC LIMIT 1`).get(n.id) as any;
            return { ...n, details, lastEvent: last ? { sessionNumber: last.num, sessionTitle: last.title, eventDescription: last.eventDescription } : null };
        });
        return actionResponse(enriched);
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function getCharacterHistory(charId: string) {
    try {
        const history = db.prepare(`SELECT e.*, s.session_number as sessionNumber, s.title as sessionTitle FROM CharacterEvent e JOIN Session s ON e.sessionId = s.id WHERE e.characterId = ? ORDER BY e.order_index ASC`).all(charId) as any[];
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

export async function reorderCharacterEvents(orderedIds: string[]) {
    try {
        db.transaction(() => {
            const updateStmt = db.prepare("UPDATE CharacterEvent SET order_index = ? WHERE id = ?");
            orderedIds.forEach((id, idx) => updateStmt.run(idx, id));
        })();
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function uploadGenericImage(imageData: string, entityName?: string) {
    try {
        const b64 = imageData.replace(/^data:image\/\w+;base64,/, "");
        const buf = Buffer.from(b64, 'base64');
        const sanitizedName = entityName ? entityName.trim().replace(/\s+/g, '_').replace(/[^\w\d_]/g, '') : 'img';
        const name = `${sanitizedName}_${Date.now()}.jpg`;
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

export async function getAssetsBackup() {
    try {
        const assets: any[] = [];
        const dir = getAssetDir();
        if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                const content = fs.readFileSync(filePath, { encoding: 'base64' });
                assets.push({ name: file, content });
            }
        }
        return actionResponse({ Assets: assets });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function restoreBackupData(jsonString: string) {
    try {
        const data = JSON.parse(jsonString);
        if (!data || typeof data !== 'object') throw new Error("Formato backup non valido.");
        if (data.Assets && !data.Campaign) {
            const dir = getAssetDir();
            for (const asset of data.Assets) {
                if (asset.name && asset.content) {
                    const buf = Buffer.from(asset.content, 'base64');
                    fs.writeFileSync(path.join(dir, asset.name), buf);
                }
            }
            return actionResponse({ success: true, mode: 'assets' });
        }
        const tableMapping: Record<string, string> = { 'campaigns': 'Campaign', 'campaign': 'Campaign', 'story_arcs': 'StoryArc', 'storyarc': 'StoryArc', 'sessions': 'Session', 'session': 'Session', 'magic_items': 'MagicItem', 'magicitem': 'MagicItem', 'monsters': 'Monster', 'monster': 'Monster', 'rewards': 'Reward', 'reward': 'Reward', 'character_events': 'CharacterEvent', 'characterevent': 'CharacterEvent', 'player_characters': 'PlayerCharacter', 'playercharacter': 'PlayerCharacter', 'characters': 'PlayerCharacter', 'custom_spells': 'CustomSpell', 'customspell': 'CustomSpell', 'spells': 'CustomSpell', 'custom_skills': 'CustomSkill', 'customskill': 'CustomSkill', 'skills': 'CustomSkill', 'possessed_items': 'PossessedItems', 'possesseditems': 'PossessedItems', 'letter_presets': 'LetterPreset', 'letterpreset': 'LetterPreset', 'shops': 'Shop', 'shop': 'Shop', 'world_locations': 'WorldLocation', 'worldlocation': 'WorldLocation', 'npcs': 'Npc', 'npc': 'Npc', 'combats': 'Combat', 'combat': 'Combat', 'homebrew_rules': 'HomebrewRule', 'homebrewrule': 'HomebrewRule', 'rules': 'HomebrewRule', 'system_prompts': 'SystemPrompt', 'systemprompt': 'SystemPrompt', 'session_loot': 'SessionLoot', 'sessionloot': 'SessionLoot' };
        const columnMapping: Record<string, string> = { 'isArchived': 'is_archived', 'isSummarized': 'is_summarized', 'sessionNumber': 'session_number', 'xpAward': 'xp_award', 'lootScanned': 'loot_scanned', 'isRead': 'is_read', 'activeArcLabel': 'active_arc_label', 'globalCompendium': 'global_compendium', 'imageUrl': 'imageUrl', 'image_url': 'imageUrl', 'orderIndex': 'order_index' };
        db.exec("PRAGMA foreign_keys = OFF");
        try {
            db.transaction(() => {
                const existingTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((t: any) => t.name);
                for (const table of existingTables) {
                    if (table === 'sqlite_sequence' || table.startsWith('sqlite_')) continue;
                    db.prepare(`DELETE FROM ${table}`).run();
                }
                for (const [key, rows] of Object.entries(data)) {
                    if (key === 'Assets') continue;
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
            })();
            if (data.Assets && Array.isArray(data.Assets)) {
                const dir = getAssetDir();
                for (const asset of data.Assets) {
                    if (asset.name && asset.content) {
                        const buf = Buffer.from(asset.content, 'base64');
                        fs.writeFileSync(path.join(dir, asset.name), buf);
                    }
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
        } finally { db.exec("PRAGMA foreign_keys = ON"); }
        return actionResponse({ success: true, mode: 'data' });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function relinkImagesAction() {
    try {
        const dir = getAssetDir();
        if (!fs.existsSync(dir)) throw new Error("Directory asset non trovata.");
        const files = fs.readdirSync(dir);
        let relinkedCount = 0;
        db.transaction(() => {
            const pcs = db.prepare("SELECT id, name, imageUrl FROM PlayerCharacter").all() as any[];
            for (const pc of pcs) {
                let currentUrl = pc.imageUrl;
                if (!currentUrl) {
                    const match = files.find(f => f.toLowerCase().startsWith(pc.name.toLowerCase().replace(/\s+/g, '_')));
                    if (match) {
                        db.prepare("UPDATE PlayerCharacter SET imageUrl = ? WHERE id = ?").run(`/api/assets/${match}`, pc.id);
                        relinkedCount++;
                    }
                } else if (!currentUrl.startsWith('/api/assets/')) {
                    const parts = currentUrl.split(/[/\\]/);
                    const fileName = parts[parts.length - 1];
                    if (files.includes(fileName)) {
                        db.prepare("UPDATE PlayerCharacter SET imageUrl = ? WHERE id = ?").run(`/api/assets/${fileName}`, pc.id);
                        relinkedCount++;
                    }
                }
            }
            const npcs = db.prepare("SELECT id, name, details FROM Npc").all() as any[];
            for (const npc of npcs) {
                const details = JSON.parse(npc.details) as NpcDetails;
                let currentUrl = details.imageUrl;
                let updated = false;
                if (!currentUrl) {
                    const match = files.find(f => f.toLowerCase().startsWith(npc.name.toLowerCase().replace(/\s+/g, '_')));
                    if (match) {
                        details.imageUrl = `/api/assets/${match}`;
                        updated = true;
                    }
                } else if (currentUrl && !currentUrl.startsWith('/api/assets/')) {
                    const parts = currentUrl.split(/[/\\]/);
                    const fileName = parts[parts.length - 1];
                    if (files.includes(fileName)) {
                        details.imageUrl = `/api/assets/${fileName}`;
                        updated = true;
                    }
                }
                if (updated) {
                    db.prepare("UPDATE Npc SET details = ? WHERE id = ?").run(JSON.stringify(details), npc.id);
                    relinkedCount++;
                }
            }
            const items = db.prepare("SELECT id, name, imageUrl FROM MagicItem").all() as any[];
            for (const it of items) {
                if (it.imageUrl && !it.imageUrl.startsWith('/api/assets/')) {
                    const parts = it.imageUrl.split(/[/\\]/);
                    const fileName = parts[parts.length - 1];
                    if (files.includes(fileName)) {
                        db.prepare("UPDATE MagicItem SET imageUrl = ? WHERE id = ?").run(`/api/assets/${fileName}`, it.id);
                        relinkedCount++;
                    }
                }
            }
        })();
        return actionResponse({ relinkedCount });
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
        const now = new Date().toISOString();
        const rewardCols = getTableCols('Reward');
        const d: Record<string, any> = { id: randomUUID(), campaignId, sessionId: 'manual', name, description, createdAt: now, updatedAt: now };
        const insertCols = Object.keys(d).filter(c => rewardCols.includes(c.toLowerCase()));
        db.prepare(`INSERT INTO Reward (${insertCols.join(',')}) VALUES (${insertCols.map(() => '?').join(',')})`).run(...insertCols.map(c => d[c]));
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function updateReward(reward: any) {
    try {
        const rewardCols = getTableCols('Reward');
        const hasUpdatedAt = rewardCols.includes('updatedat');
        if (hasUpdatedAt) {
            db.prepare("UPDATE Reward SET name = ?, description = ?, updatedAt = ? WHERE id = ?").run(reward.name, reward.description, new Date().toISOString(), reward.id);
        } else {
            db.prepare("UPDATE Reward SET name = ?, description = ? WHERE id = ?").run(reward.name, reward.description, reward.id);
        }
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
        const shopCols = getTableCols('Shop');
        const d: Record<string, any> = { id, campaignId: data.campaignId, name: data.name, owner: data.owner, description: data.description, inventory: data.inventory, createdAt: data.createdAt || now, updatedAt: now };
        const insertCols = Object.keys(d).filter(c => shopCols.includes(c.toLowerCase()));
        const placeholders = insertCols.map(() => '?').join(',');
        const updateSet = insertCols.filter(c => !['id', 'name', 'campaignid', 'createdat'].includes(c.toLowerCase())).map(c => `${c}=excluded.${c}`).join(', ');
        db.prepare(`INSERT INTO Shop (${insertCols.join(',')}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updateSet}`).run(...insertCols.map(c => d[c]));
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
        const locCols = getTableCols('WorldLocation');
        const d: Record<string, any> = { id, campaignId: data.campaignId, name: data.name, scale: data.scale, style: data.style, atmosphere: data.atmosphere, details: data.details, createdAt: data.createdAt || now, updatedAt: now };
        const insertCols = Object.keys(d).filter(c => locCols.includes(c.toLowerCase()));
        const placeholders = insertCols.map(() => '?').join(',');
        const updateSet = insertCols.filter(c => !['id', 'name', 'campaignid', 'createdat'].includes(c.toLowerCase())).map(c => `${c}=excluded.${c}`).join(', ');
        db.prepare(`INSERT INTO WorldLocation (${insertCols.join(',')}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updateSet}`).run(...insertCols.map(c => d[c]));
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
        if (data.id) {
            const npc = db.prepare("SELECT details FROM Npc WHERE id = ?").get(data.id) as { details: string };
            if (npc) {
                const oldDetails = JSON.parse(npc.details);
                const newDetails = JSON.parse(data.details);
                if (oldDetails.imageUrl && oldDetails.imageUrl !== newDetails.imageUrl) {
                    deleteAssetFile(oldDetails.imageUrl);
                }
            }
        }

        const npcCols = getTableCols('Npc');
        const d: Record<string, any> = { id, campaignId: data.campaignId, name: data.name, race: data.race, gender: data.gender, age: data.age, status: data.status, alignment: data.alignment, details: data.details, createdAt: data.createdAt || now, updatedAt: now };
        const insertCols = Object.keys(d).filter(c => npcCols.includes(c.toLowerCase()));
        const placeholders = insertCols.map(() => '?').join(',');
        const updateSet = insertCols.filter(c => !['id', 'name', 'campaignid', 'createdat'].includes(c.toLowerCase())).map(c => `${c}=excluded.${c}`).join(', ');
        db.prepare(`INSERT INTO Npc (${insertCols.join(',')}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updateSet}`).run(...insertCols.map(c => d[c]));
        return actionResponse({ id });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function deleteNpc(id: string) {
    try {
        const npc = db.prepare("SELECT details FROM Npc WHERE id = ?").get(id) as { details: string };
        if (npc) {
            const d = JSON.parse(npc.details);
            deleteAssetFile(d.imageUrl);
        }
        db.prepare("DELETE FROM Npc WHERE id = ?").run(id);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function saveCombat(data: any) {
    try {
        const id = data.id || randomUUID();
        const now = new Date().toISOString();
        const combatCols = getTableCols('Combat');
        const d: Record<string, any> = { id, campaignId: data.campaignId, name: data.name, difficulty: data.difficulty, details: data.details, createdAt: data.createdAt || now, updatedAt: now };
        const insertCols = Object.keys(d).filter(c => combatCols.includes(c.toLowerCase()));
        const placeholders = insertCols.map(() => '?').join(',');
        const updateSet = insertCols.filter(c => !['id', 'name', 'campaignid', 'createdat'].includes(c.toLowerCase())).map(c => `${c}=excluded.${c}`).join(', ');
        db.prepare(`INSERT INTO Combat (${insertCols.join(',')}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updateSet}`).run(...insertCols.map(c => d[c]));
        return actionResponse({ id });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function deleteCombat(id: string) {
    try {
        db.prepare("DELETE FROM Combat WHERE id = ?").run(id);
        return actionResponse({ success: true });
    } catch (e: any) { return actionResponse(null, e.message); }
}

export async function migrateOldCharacters(campaignId: string, oldData: string) {
  try {
    const chars = JSON.parse(oldData);
    db.transaction(() => {
      const now = new Date().toISOString();
      const cols = getTableCols('PlayerCharacter');
      for (const char of chars) {
        const id = char.id || randomUUID();
        const d: Record<string, any> = { id, campaignId, name: char.name, class: char.class, archetype: char.archetype, level: char.level, hitPoints: char.hitPoints, armorClass: char.armorClass, strength: char.strength, dexterity: char.dexterity, constitution: char.constitution, intelligence: char.intelligence, wisdom: char.wisdom, charisma: char.charisma, background: char.background, imageUrl: char.imageUrl, spells: char.spells, traits: char.traits, ideals: char.ideals, bonds: char.bonds, flaws: char.flaws, createdAt: now, updatedAt: now };
        const insertCols = Object.keys(d).filter(c => cols.includes(c.toLowerCase()));
        db.prepare(`INSERT OR IGNORE INTO PlayerCharacter (${insertCols.join(',')}) VALUES (${insertCols.map(() => '?').join(',')})`).run(...insertCols.map(c => d[c]));
      }
    })();
    return actionResponse({ success: true });
  } catch (e: any) { return actionResponse(null, e.message); }
}
