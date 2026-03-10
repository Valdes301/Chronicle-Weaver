
'use server';

import db from '@/lib/db';
import { initializeCampaign as initializeCampaignFlow } from '@/ai/flows/initialize-campaign';
import { extractEntities as extractEntitiesFlow } from '@/ai/flows/extract-entities';
import { generateNextSession as generateNextSessionFlow } from '@/ai/flows/generate-next-session';
import { summarizeCampaign as summarizeCampaignFlow } from '@/ai/flows/summarize-campaign';
import { generateMap as generateMapFlow } from '@/ai/flows/generate-map';
import { importContent as importContentFlow } from '@/ai/flows/import-content';
import type { Session, CampaignWithRelations, Campaign, MagicItem, Monster, PlayerCharacter, Spell, Skill } from '@/lib/types';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';


// Helper function to return a consistent response format
const actionResponse = <T>(data: T | null, error?: string) => {
    if (error) {
        return { success: false, data: null, error };
    }
    return { success: true, data, error: null };
}

export async function uploadCardBackground(imageData: string, filename: string = 'card-background.jpg') {
    try {
        if (!imageData.startsWith('data:image/')) {
            throw new Error('Formato dati immagine non valido.');
        }

        const base64Data = imageData.split(';base64,').pop();
        if (!base64Data) {
            throw new Error('Dati immagine base64 non trovati.');
        }
        
        const buffer = Buffer.from(base64Data, 'base64');
        
        const publicDir = path.join(process.cwd(), 'public');
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }
        
        // Use the filename provided to distinguish between fronts, backs, spells, and items
        fs.writeFileSync(path.join(publicDir, filename), buffer);
        
        return actionResponse({ success: true });
    } catch (error: any) {
        console.error("Error uploading card background:", error);
        return actionResponse(null, "Impossibile caricare l'immagine di sfondo: " + error.message);
    }
}

// AI-related Actions

export async function importContentAction(fileContent: string, campaignId: string) {
    try {
        const result = await importContentFlow({ fileContent });
        let addedItems = 0;
        let addedWeapons = 0;
        let addedArmors = 0;
        let addedMonsters = 0;
        let addedSpells = 0;
        let addedSkills = 0;

        if (result.newMagicItems && result.newMagicItems.length > 0) {
            for (const item of result.newMagicItems) {
               await saveMagicItem({ ...item, campaignId });
               const itemType = item.type?.toLowerCase() ?? '';
               if (itemType.includes('arma') || itemType.includes('munizione')) {
                   addedWeapons++;
               } else if (itemType.includes('armatura') || itemType.includes('scudo')) {
                   addedArmors++;
               } else {
                   addedItems++;
               }
            }
        }
        if (result.newMonsters && result.newMonsters.length > 0) {
            for (const monster of result.newMonsters) {
                await saveMonster({ ...monster, campaignId });
                addedMonsters++;
            }
        }
        if (result.newSpells && result.newSpells.length > 0) {
            for (const spell of result.newSpells) {
                await saveSpell({ ...spell, campaignId });
                addedSpells++;
            }
        }
        if (result.newSkills && result.newSkills.length > 0) {
            for (const skill of result.newSkills) {
                await saveSkill({ ...skill, campaignId });
                addedSkills++;
            }
        }
        
        return actionResponse({ addedItems, addedWeapons, addedArmors, addedMonsters, addedSpells, addedSkills });

    } catch (error: any) {
        console.error("Error in importContentAction:", error);
        return actionResponse(null, `Errore durante l'analisi del contenuto: ${error.message}`);
    }
}


export async function generateMapAction(prompt: string) {
    try {
        const svgString = await generateMapFlow(prompt);
        return actionResponse({ svgString });
    } catch (error: any) {
        return actionResponse(null, `Errore durante la generazione della mappa: ${error.message}`);
    }
}

export async function generateNextSession(
  campaign: CampaignWithRelations,
  sessions: Session[],
  prompt: string,
  modification?: { storyToModify: string; request: string }
) {
  try {
    const allCharacters = db.prepare('SELECT * FROM PlayerCharacter WHERE campaignId = ?').all(campaign.id) as PlayerCharacter[];
    const charactersJson = JSON.stringify(allCharacters.map(c => {
        const skillsArray = c.skills ? JSON.parse(c.skills) : [];
        return {
            name: c.name,
            race: c.race,
            class: c.class,
            archetype: c.archetype,
            level: c.level,
            background: c.background,
            traits: c.traits,
            ideals: c.ideals,
            bonds: c.bonds,
            flaws: c.flaws,
            stats: {
                strength: c.strength,
                dexterity: c.dexterity,
                constitution: c.constitution,
                intelligence: c.intelligence,
                wisdom: c.wisdom,
                charisma: c.charisma,
            },
            skills: skillsArray,
            spells: c.spells ? c.spells.split(',').map(s => s.trim()) : [],
        }
    }));

    // Use last 2 sessions for recent context
    const recentSessions = sessions.slice(-2);
    const recentSessionsSummary = recentSessions
      .map(
        (s) =>
          `Sessione ${s.session_number} (${
            s.source === 'generated' ? 'Importata' : 'Generata'
          }): ${s.title}\n${s.notes ?? ''}`
      )
      .join('\n\n---\n\n');

    const result = await generateNextSessionFlow({
      campaignName: campaign.name,
      campaignSetting: campaign.setting,
      campaignSummary: campaign.summary ?? undefined,
      recentSessionsSummary: recentSessionsSummary || 'Questa è la prima sessione.',
      playerCharacters: charactersJson || 'Nessuna informazione sui personaggi fornita.',
      customPrompt: prompt,
      storyToModify: modification?.storyToModify,
      modificationRequest: modification?.request,
    });

    return actionResponse(result);
  } catch (error: any) {
    return actionResponse(null, `Errore durante la generazione della sessione: ${error.message}`);
  }
}

export async function summarizeCampaign(campaignId: string) {
    try {
        const sessions = db.prepare('SELECT session_number, title, notes FROM Session WHERE campaignId = ? ORDER BY session_number ASC').all(campaignId) as Pick<Session, 'session_number' | 'title' | 'notes'>[];

        if (!sessions || sessions.length === 0) {
            throw new Error("Nessuna sessione da riassumere.");
        }

        const campaignHistory = sessions
            .map(s => `Sessione ${s.session_number}: ${s.title}\n${s.notes}`)
            .join('\n\n---\n\n');
        
        const result = await summarizeCampaignFlow({ campaignHistory });

        db.prepare('UPDATE Campaign SET summary = ? WHERE id = ?').run(result.summary, campaignId);

        return actionResponse({ message: "Sommario della campagna aggiornato." });

    } catch (error: any) {
        return actionResponse(null, error.message);
    }
}


// Campaign Actions
export async function createCampaign(data: { name: string; setting: string; description?: string | null; }) {
    try {
        const result = await initializeCampaignFlow({
            campaignName: data.name,
            setting: data.setting,
            description: data.description ?? undefined,
        });
        
        const campaignId = randomUUID();
        const now = new Date().toISOString();
        
        db.prepare(
            `INSERT INTO Campaign (id, name, setting, description, summary, player_characters, createdAt, updatedAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(campaignId, data.name, data.setting, data.description || null, result.initial_summary, null, now, now);

        const newCampaign = db.prepare('SELECT * FROM Campaign WHERE id = ?').get(campaignId) as Campaign;
        
        return { success: true, campaign: newCampaign, progress: result.progress };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteCampaign(campaignId: string) {
    try {
        db.prepare('DELETE FROM Campaign WHERE id = ?').run(campaignId);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: "Impossibile cancellare la campagna. " + error.message };
    }
}

export async function migrateOldCharacters(campaignId: string, oldCharactersData: string) {
    try {
        const charactersToMigrate: any[] = JSON.parse(oldCharactersData);
        if (!Array.isArray(charactersToMigrate)) {
            throw new Error("Formato dati vecchio non valido.");
        }

        const insert = db.prepare(
            `INSERT INTO PlayerCharacter (id, campaignId, name, class, archetype, strength, dexterity, constitution, intelligence, wisdom, charisma, background, createdAt, updatedAt, race, level, hitPoints, armorClass, skills, spells, pact, school, domain, traits, ideals, bonds, flaws) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );

        const migrationTransaction = db.transaction(() => {
            for (const char of charactersToMigrate) {
                const now = new Date().toISOString();
                insert.run(
                    char.id || randomUUID(), 
                    campaignId, 
                    char.name, 
                    char.class, 
                    char.archetype, 
                    parseInt(char.strength, 10) || 10,
                    parseInt(char.dexterity, 10) || 10,
                    parseInt(char.constitution, 10) || 10,
                    parseInt(char.intelligence, 10) || 10,
                    parseInt(char.wisdom, 10) || 10,
                    parseInt(char.charisma, 10) || 10,
                    char.background, 
                    now, 
                    now,
                    null, null, null, null, null, null, null, null, null,
                    null, null, null, null
                );
            }
            db.prepare('UPDATE Campaign SET player_characters = NULL WHERE id = ?').run(campaignId);
        });
        
        migrationTransaction();
        return actionResponse({ success: true });
    } catch (error: any) {
        // If it fails, it might just be malformed string. We can clear it to prevent repeated attempts.
        db.prepare('UPDATE Campaign SET player_characters = NULL WHERE id = ?').run(campaignId);
        return actionResponse(null, `Errore durante la migrazione dei personaggi: ${error.message}. I dati precedenti sono stati rimossi per permettere di procedere.`);
    }
}

export async function savePlayerCharacter(characterData: Omit<PlayerCharacter, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    try {
        const { id, campaignId, ...data } = characterData;
        const now = new Date().toISOString();
        
        const skillsString = data.skills ? JSON.stringify(data.skills) : '[]';

        if (id) {
            // Update
            db.prepare(
                `UPDATE PlayerCharacter SET 
                    name = ?, class = ?, archetype = ?, strength = ?, dexterity = ?, 
                    constitution = ?, intelligence = ?, wisdom = ?, charisma = ?, 
                    background = ?, race = ?, level = ?, hitPoints = ?, armorClass = ?,
                    skills = ?, spells = ?, pact = ?, school = ?, domain = ?, 
                    traits = ?, ideals = ?, bonds = ?, flaws = ?,
                    updatedAt = ?
                 WHERE id = ? AND campaignId = ?`
            ).run(
                data.name, data.class, data.archetype, 
                data.strength, data.dexterity, data.constitution, 
                data.intelligence, data.wisdom, data.charisma, 
                data.background, data.race, data.level, data.hitPoints, data.armorClass,
                skillsString, data.spells, data.pact, data.school, data.domain,
                data.traits, data.ideals, data.bonds, data.flaws,
                now, id, campaignId
            );
        } else {
            // Create
            const newId = randomUUID();
            db.prepare(
                `INSERT INTO PlayerCharacter (id, campaignId, name, class, archetype, strength, dexterity, constitution, intelligence, wisdom, charisma, background, createdAt, updatedAt, race, level, hitPoints, armorClass, skills, spells, pact, school, domain, traits, ideals, bonds, flaws) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).run(
                newId, campaignId, data.name, data.class, data.archetype, 
                data.strength, data.dexterity, data.constitution, 
                data.intelligence, data.wisdom, data.charisma, 
                data.background, now, now, data.race, data.level, data.hitPoints,
                data.armorClass, skillsString, data.spells, data.pact, data.school, data.domain,
                data.traits, data.ideals, data.bonds, data.flaws
            );
        }
        return actionResponse({ success: true });
    } catch (error: any) {
        return actionResponse(null, "Impossibile salvare il personaggio. " + error.message);
    }
}

export async function deletePlayerCharacter(characterId: string) {
    try {
        db.prepare('DELETE FROM PlayerCharacter WHERE id = ?').run(characterId);
        return actionResponse({ success: true });
    } catch (error: any) {
        return actionResponse(null, "Impossibile eliminare il personaggio. " + error.message);
    }
}


// Session Actions
async function extractAndSaveEntities(storyText: string, campaignId: string) {
    const existingItems = db.prepare('SELECT name FROM MagicItem WHERE campaignId = ?').all(campaignId) as {name: string}[];
    const existingMonsters = db.prepare('SELECT name FROM Monster WHERE campaignId = ?').all(campaignId) as {name: string}[];

    const result = await extractEntitiesFlow({
        storyText,
        existingMagicItems: existingItems.map(item => item.name),
        existingMonsters: existingMonsters.map(monster => monster.name),
    });

    const insertMagicItem = db.prepare(
        `INSERT OR IGNORE INTO MagicItem (id, name, type, rarity, attunement, description, campaignId, cost) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertMonster = db.prepare(
        `INSERT OR IGNORE INTO Monster (id, name, type, armorClass, hitPoints, challenge, description, campaignId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    db.transaction(() => {
        if (result.newMagicItems && result.newMagicItems.length > 0) {
            for (const item of result.newMagicItems) {
                insertMagicItem.run(randomUUID(), item.name, item.type, item.rarity, item.attunement ?? 'No', item.description, campaignId, (item as any).cost);
            }
        }
        if (result.newMonsters && result.newMonsters.length > 0) {
            for (const monster of result.newMonsters) {
                insertMonster.run(randomUUID(), monster.name, monster.type, monster.armorClass, monster.hitPoints, monster.challenge, monster.description, campaignId);
            }
        }
    })();
}

export async function confirmSession(sessionData: Omit<Session, 'id' | 'campaignId' | 'createdAt' | 'updatedAt' | 'is_read'>, campaignId: string) {
    try {
        const sessionId = randomUUID();
        const now = new Date().toISOString();
        db.prepare(
            `INSERT INTO Session (id, session_number, title, notes, xp_award, source, createdAt, updatedAt, campaignId, is_read)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(sessionId, sessionData.session_number, sessionData.title, sessionData.notes, sessionData.xp_award, sessionData.source, now, now, campaignId, 0);
        
        await extractAndSaveEntities(sessionData.notes ?? '', campaignId);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: "Impossibile confermare la sessione. " + error.message };
    }
}

export async function importSession(notes: string, title: string, campaignId: string, session_number: number) {
    try {
        const sessionId = randomUUID();
        const now = new Date().toISOString();
        db.prepare(
            `INSERT INTO Session (id, session_number, title, notes, source, createdAt, updatedAt, campaignId, xp_award, is_read)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(sessionId, session_number, title || `Sessione ${session_number} (Importata)`, notes, 'imported', now, now, campaignId, 0, 0);

        await extractAndSaveEntities(notes, campaignId);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: "Impossibile importare la sessione. " + error.message };
    }
}

export async function updateSessionTitle(sessionId: string, title: string) {
    try {
        db.prepare('UPDATE Session SET title = ?, updatedAt = ? WHERE id = ?').run(title, new Date().toISOString(), sessionId);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateSessionNotes(sessionId: string, notes: string) {
    try {
        const session = db.prepare('SELECT campaignId FROM Session WHERE id = ?').get(sessionId) as { campaignId: string };
        if (!session) throw new Error("Sessione non trovata");

        db.prepare('UPDATE Session SET notes = ?, updatedAt = ? WHERE id = ?').run(notes, new Date().toISOString(), sessionId);
        
        await extractAndSaveEntities(notes, session.campaignId);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteSession(sessionId: string) {
    try {
        const sessionToDelete = db.prepare('SELECT * FROM Session WHERE id = ?').get(sessionId) as Session | undefined;
        if (!sessionToDelete) throw new Error("Sessione non trovata");

        const renumberSubsequentSessions = db.transaction(() => {
            db.prepare('DELETE FROM Session WHERE id = ?').run(sessionId);

            db.prepare(
                `UPDATE Session 
                 SET session_number = session_number - 1 
                 WHERE campaignId = ? AND session_number > ?`
            ).run(sessionToDelete.campaignId, sessionToDelete.session_number);
        });

        renumberSubsequentSessions();

        return { success: true };
    } catch (error: any) {
        return { success: false, error: "Impossibile eliminare la sessione. " + error.message };
    }
}

export async function reorderSessions(orderedSessionIds: string[], campaignId: string) {
    if (!orderedSessionIds || orderedSessionIds.length === 0) {
        return actionResponse(null, "Nessun ID di sessione fornito.");
    }
    
    try {
        // The received IDs are ordered by their desired session_number ASC.
        const reorderTransaction = db.transaction(() => {
            const updateStmt = db.prepare('UPDATE Session SET session_number = ?, updatedAt = ? WHERE id = ? AND campaignId = ?');
            const now = new Date().toISOString();
            orderedSessionIds.forEach((id, index) => {
                const newSessionNumber = index + 1; // session_number is 1-based
                updateStmt.run(newSessionNumber, now, id, campaignId);
            });
        });

        reorderTransaction();
        return actionResponse({ success: true });
    } catch (error: any) {
        return actionResponse(null, "Impossibile riordinare le sessioni: " + error.message);
    }
}

export async function toggleSessionReadStatus(sessionId: string) {
    try {
        db.prepare('UPDATE Session SET is_read = NOT is_read, updatedAt = ? WHERE id = ?')
          .run(new Date().toISOString(), sessionId);
        return actionResponse({ success: true });
    } catch (error: any) {
        return actionResponse(null, "Impossibile aggiornare lo stato: " + error.message);
    }
}

export async function updateSessionXp(sessionId: string, xp: number) {
    try {
        db.prepare('UPDATE Session SET xp_award = ?, updatedAt = ? WHERE id = ?')
          .run(xp, new Date().toISOString(), sessionId);
        return actionResponse({ success: true });
    } catch (error: any) {
        return actionResponse(null, "Impossibile aggiornare gli XP: " + error.message);
    }
}


// Backup & Restore Actions
export async function getBackupData() {
    try {
        const campaigns = db.prepare('SELECT * FROM Campaign').all() as Campaign[];
        const data = campaigns.map(campaign => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { player_characters, ...campaignData } = campaign; // Omit obsolete field

            const sessions = db.prepare('SELECT * FROM Session WHERE campaignId = ?').all(campaign.id);
            const magicItems = db.prepare('SELECT * FROM MagicItem WHERE campaignId = ?').all(campaign.id);
            const monsters = db.prepare('SELECT * FROM Monster WHERE campaignId = ?').all(campaign.id);
            const playerCharactersData = db.prepare('SELECT * FROM PlayerCharacter WHERE campaignId = ?').all(campaign.id);
            const customSpells = db.prepare('SELECT * FROM CustomSpell WHERE campaignId = ?').all(campaign.id);
            const customSkills = db.prepare('SELECT * FROM CustomSkill WHERE campaignId = ?').all(campaign.id);
            const possessedItems = db.prepare('SELECT * FROM PossessedItems WHERE campaignId = ?').all(campaign.id);
            return { ...campaignData, sessions, magicItems, monsters, playerCharacters: playerCharactersData, customSpells, customSkills, possessedItems };
        });
        return actionResponse({ campaigns: data });
    } catch (error: any) {
        return actionResponse(null, error.message);
    }
}

export async function restoreBackupData(jsonData: string) {
    try {
        const { campaigns } = JSON.parse(jsonData);
        
        if (!campaigns || !Array.isArray(campaigns)) {
            throw new Error("Formato di backup non valido: array 'campaigns' mancante.");
        }

        const restoreTransaction = db.transaction((campaignsToRestore: any[]) => {
            const campaignStmt = db.prepare(`INSERT OR REPLACE INTO Campaign (id, name, setting, description, summary, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`);
            const sessionStmt = db.prepare(`INSERT INTO Session (id, session_number, title, notes, xp_award, source, createdAt, updatedAt, campaignId, is_read) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            const magicItemStmt = db.prepare(`INSERT INTO MagicItem (id, name, type, rarity, attunement, description, cost, campaignId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
            const monsterStmt = db.prepare(`INSERT INTO Monster (id, name, type, armorClass, hitPoints, challenge, description, campaignId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
            const playerCharacterStmt = db.prepare(`INSERT INTO PlayerCharacter (id, campaignId, name, class, archetype, strength, dexterity, constitution, intelligence, wisdom, charisma, background, createdAt, updatedAt, race, level, hitPoints, armorClass, skills, spells, pact, school, domain, traits, ideals, bonds, flaws) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            const customSpellStmt = db.prepare(`INSERT INTO CustomSpell (id, name, level, school, casting_time, range, components, duration, description, classes, campaignId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            const customSkillStmt = db.prepare(`INSERT INTO CustomSkill (id, name, ability, description, campaignId) VALUES (?, ?, ?, ?, ?)`);
            const possessedItemStmt = db.prepare(`INSERT INTO PossessedItems (campaignId, itemName) VALUES (?, ?)`);

            for (const campaign of campaignsToRestore) {
                const now = new Date().toISOString();

                // Clean up old data for this campaign before inserting new data
                db.prepare('DELETE FROM Session WHERE campaignId = ?').run(campaign.id);
                db.prepare('DELETE FROM MagicItem WHERE campaignId = ?').run(campaign.id);
                db.prepare('DELETE FROM Monster WHERE campaignId = ?').run(campaign.id);
                db.prepare('DELETE FROM PlayerCharacter WHERE campaignId = ?').run(campaign.id);
                db.prepare('DELETE FROM CustomSpell WHERE campaignId = ?').run(campaign.id);
                db.prepare('DELETE FROM CustomSkill WHERE campaignId = ?').run(campaign.id);
                db.prepare('DELETE FROM PossessedItems WHERE campaignId = ?').run(campaign.id);
                
                campaignStmt.run(
                    campaign.id, 
                    campaign.name, 
                    campaign.setting, 
                    campaign.description, 
                    campaign.summary || '', 
                    campaign.createdAt || now, 
                    campaign.updatedAt || campaign.createdAt || now
                );
                
                if (campaign.sessions?.length > 0) {
                    for (const s of campaign.sessions) {
                        sessionStmt.run(s.id, s.session_number, s.title, s.notes, s.xp_award || 0, s.source, s.createdAt || now, s.updatedAt || s.createdAt || now, campaign.id, s.is_read || 0);
                    }
                }
                if (campaign.magicItems?.length > 0) {
                    for (const i of campaign.magicItems) {
                        magicItemStmt.run(i.id || randomUUID(), i.name, i.type, i.rarity, i.attunement, i.description, i.cost, campaign.id);
                    }
                }
                if (campaign.monsters?.length > 0) {
                    for (const m of campaign.monsters) {
                        monsterStmt.run(m.id || randomUUID(), m.name, m.type, m.armorClass, m.hitPoints, m.challenge, m.description, campaign.id);
                    }
                }
                 if (campaign.customSpells?.length > 0) {
                    for (const s of campaign.customSpells) {
                        customSpellStmt.run(s.id || randomUUID(), s.name, s.level, s.school, s.casting_time, s.range, s.components, s.duration, s.description, s.classes, campaign.id);
                    }
                }
                if (campaign.customSkills?.length > 0) {
                    for (const s of campaign.customSkills) {
                       customSkillStmt.run(s.id || randomUUID(), s.name, s.ability, s.description, campaign.id);
                    }
                }
                if (campaign.playerCharacters?.length > 0) {
                    for (const p of campaign.playerCharacters) {
                        playerCharacterStmt.run(p.id, p.campaignId, p.name, p.class, p.archetype, p.strength, p.dexterity, p.constitution, p.intelligence, p.wisdom, p.charisma, p.background, p.createdAt || now, p.updatedAt || p.createdAt || now, p.race, p.level, p.hitPoints, p.armorClass, p.skills, p.spells, p.pact, p.school, p.domain, p.traits, p.ideals, p.bonds, p.flaws);
                    }
                }
                if (campaign.possessedItems?.length > 0) {
                    for (const p of campaign.possessedItems) {
                        possessedItemStmt.run(campaign.id, p.itemName);
                    }
                }
            }
        });

        restoreTransaction(campaigns);

        return actionResponse({ message: "Ripristino completato." });

    } catch (error: any) {
        console.error("Errore di ripristino:", error);
        return actionResponse(null, "Errore durante il ripristino: " + error.message);
    }
}


// CRUD actions for custom entities
export async function saveMonster(monsterData: Partial<Monster> & { campaignId: string }) {
    try {
        const { id, campaignId, ...data } = monsterData;
        if (id) {
            db.prepare(`
                UPDATE Monster SET name = ?, type = ?, armorClass = ?, hitPoints = ?, challenge = ?, description = ? 
                WHERE id = ? AND campaignId = ?
            `).run(data.name, data.type, data.armorClass, data.hitPoints, data.challenge, data.description, id, campaignId);
        } else {
            db.prepare(`
                INSERT INTO Monster (id, name, type, armorClass, hitPoints, challenge, description, campaignId)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(name, campaignId) DO UPDATE SET
                    type = excluded.type,
                    armorClass = excluded.armorClass,
                    hitPoints = excluded.hitPoints,
                    challenge = excluded.challenge,
                    description = excluded.description
            `).run(randomUUID(), data.name, data.type, data.armorClass, data.hitPoints, data.challenge, data.description, campaignId);
        }
        return actionResponse({ success: true });
    } catch (error: any) {
        return actionResponse(null, "Impossibile salvare il mostro. " + error.message);
    }
}

export async function deleteMonster(id: string) {
    try {
        db.prepare('DELETE FROM Monster WHERE id = ?').run(id);
        return actionResponse({ success: true });
    } catch (error: any) {
        return actionResponse(null, "Impossibile eliminare il mostro. " + error.message);
    }
}

export async function saveMagicItem(itemData: Partial<MagicItem> & { campaignId: string }) {
    try {
        const { id, campaignId, ...data } = itemData;
        if (id) {
            db.prepare(`
                UPDATE MagicItem SET name = ?, type = ?, rarity = ?, attunement = ?, description = ?, cost = ?
                WHERE id = ? AND campaignId = ?
            `).run(data.name, data.type, data.rarity, data.attunement ?? 'No', data.description, data.cost, id, campaignId);
        } else {
            db.prepare(`
                INSERT INTO MagicItem (id, name, type, rarity, attunement, description, cost, campaignId)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(name, campaignId) DO UPDATE SET
                    type = excluded.type,
                    rarity = excluded.rarity,
                    attunement = excluded.attunement,
                    description = excluded.description,
                    cost = excluded.cost
            `).run(randomUUID(), data.name, data.type, data.rarity, data.attunement ?? 'No', data.description, data.cost, campaignId);
        }
        return actionResponse({ success: true });
    } catch (error: any) {
        return actionResponse(null, "Impossibile salvare l'oggetto. " + error.message);
    }
}

export async function deleteMagicItem(id: string) {
    try {
        db.prepare('DELETE FROM MagicItem WHERE id = ?').run(id);
        return actionResponse({ success: true });
    } catch (error: any) {
        return actionResponse(null, "Impossibile eliminare l'oggetto. " + error.message);
    }
}

export async function saveSpell(spellData: Partial<Spell> & { campaignId: string }) {
    try {
        const { id, campaignId, ...data } = spellData;
        if (id) {
            db.prepare(`
                UPDATE CustomSpell SET name = ?, level = ?, school = ?, casting_time = ?, range = ?, components = ?, duration = ?, description = ?, classes = ? 
                WHERE id = ? AND campaignId = ?
            `).run(data.name, data.level, data.school, data.casting_time, data.range, data.components, data.duration, data.description, data.classes, id, campaignId);
        } else {
            db.prepare(`
                INSERT INTO CustomSpell (id, name, level, school, casting_time, range, components, duration, description, classes, campaignId)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(name, campaignId) DO UPDATE SET
                    level = excluded.level,
                    school = excluded.school,
                    casting_time = excluded.casting_time,
                    range = excluded.range,
                    components = excluded.components,
                    duration = excluded.duration,
                    description = excluded.description,
                    classes = excluded.classes
            `).run(randomUUID(), data.name, data.level, data.school, data.casting_time, data.range, data.components, data.duration, data.description, data.classes, campaignId);
        }
        return actionResponse({ success: true });
    } catch (error: any) {
        return actionResponse(null, "Impossibile salvare l'incantesimo. " + error.message);
    }
}

export async function deleteSpell(id: string) {
    try {
        db.prepare('DELETE FROM CustomSpell WHERE id = ?').run(id);
        return actionResponse({ success: true });
    } catch (error: any) {
        return actionResponse(null, "Impossibile eliminare l'incantesimo. " + error.message);
    }
}

export async function saveSkill(skillData: Partial<Skill> & { campaignId: string }) {
    try {
        const { id, campaignId, ...data } = skillData;
        if (id) {
            db.prepare(`
                UPDATE CustomSkill SET name = ?, ability = ?, description = ? 
                WHERE id = ? AND campaignId = ?
            `).run(data.name, data.ability, data.description, id, campaignId);
        } else {
            db.prepare(`
                INSERT INTO CustomSkill (id, name, ability, description, campaignId)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(name, campaignId) DO UPDATE SET
                    ability = excluded.ability,
                    description = excluded.description
            `).run(randomUUID(), data.name, data.ability, data.description, campaignId);
        }
        return actionResponse({ success: true });
    } catch (error: any) {
        return actionResponse(null, "Impossibile salvare l'abilità. " + error.message);
    }
}

export async function deleteSkill(id: string) {
    try {
        db.prepare('DELETE FROM CustomSkill WHERE id = ?').run(id);
        return actionResponse({ success: true });
    } catch (error: any) {
        return actionResponse(null, "Impossibile eliminare l'abilità. " + error.message);
    }
}

export async function toggleItemPossession(campaignId: string, itemName: string) {
    try {
        const existing = db.prepare('SELECT 1 FROM PossessedItems WHERE campaignId = ? AND itemName = ?').get(campaignId, itemName);

        if (existing) {
            db.prepare('DELETE FROM PossessedItems WHERE campaignId = ? AND itemName = ?').run(campaignId, itemName);
        } else {
            db.prepare('INSERT INTO PossessedItems (campaignId, itemName) VALUES (?, ?)').run(campaignId, itemName);
        }
        return actionResponse({ success: true });
    } catch (error: any) {
        return actionResponse(null, "Impossibile aggiornare lo stato dell'oggetto: " + error.message);
    }
}
