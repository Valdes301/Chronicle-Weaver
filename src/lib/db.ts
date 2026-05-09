
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

const dataDir = '/app/data';

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace('file:', '')
  : path.join(dataDir, 'dev.db');

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('temp_store = MEMORY');
db.pragma('foreign_keys = ON');

db.exec(`
    CREATE TABLE IF NOT EXISTS Campaign (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        setting TEXT NOT NULL,
        description TEXT,
        summary TEXT,
        global_compendium TEXT,
        active_arc_label TEXT DEFAULT 'Arco Narrativo Attivo',
        player_characters TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS StoryArc (
        id TEXT PRIMARY KEY,
        campaignId TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT,
        world_impact TEXT,
        status TEXT NOT NULL DEFAULT 'active', -- 'active' or 'archived'
        order_index INTEGER NOT NULL DEFAULT 0,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaignId) REFERENCES Campaign (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Session (
        id TEXT PRIMARY KEY,
        session_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        notes TEXT,
        xp_award INTEGER DEFAULT 0,
        source TEXT NOT NULL,
        is_archived BOOLEAN NOT NULL DEFAULT 0,
        is_summarized BOOLEAN NOT NULL DEFAULT 0,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        campaignId TEXT NOT NULL,
        arcId TEXT,
        is_read BOOLEAN NOT NULL DEFAULT 0,
        loot_scanned BOOLEAN NOT NULL DEFAULT 0,
        FOREIGN KEY (campaignId) REFERENCES Campaign (id) ON DELETE CASCADE,
        FOREIGN KEY (arcId) REFERENCES StoryArc (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS MagicItem (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT,
        rarity TEXT,
        attunement TEXT,
        description TEXT,
        cost TEXT,
        damage TEXT,
        techType TEXT,
        imageUrl TEXT,
        campaignId TEXT NOT NULL,
        FOREIGN KEY (campaignId) REFERENCES Campaign (id) ON DELETE CASCADE,
        UNIQUE(name, campaignId)
    );

    CREATE TABLE IF NOT EXISTS Monster (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT,
        armorClass TEXT,
        hitPoints TEXT,
        challenge TEXT,
        description TEXT,
        imageUrl TEXT,
        campaignId TEXT NOT NULL,
        FOREIGN KEY (campaignId) REFERENCES Campaign (id) ON DELETE CASCADE,
        UNIQUE(name, campaignId)
    );

    CREATE TABLE IF NOT EXISTS SessionLoot (
        sessionId TEXT NOT NULL,
        entityId TEXT NOT NULL,
        entityType TEXT NOT NULL, -- 'item' or 'monster'
        PRIMARY KEY (sessionId, entityId),
        FOREIGN KEY (sessionId) REFERENCES Session (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Reward (
        id TEXT PRIMARY KEY,
        campaignId TEXT NOT NULL,
        sessionId TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        FOREIGN KEY (campaignId) REFERENCES Campaign (id) ON DELETE CASCADE,
        FOREIGN KEY (sessionId) REFERENCES Session (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS CharacterEvent (
        id TEXT PRIMARY KEY,
        characterId TEXT NOT NULL,
        characterType TEXT NOT NULL, -- 'pc' or 'npc'
        sessionId TEXT NOT NULL,
        campaignId TEXT NOT NULL,
        eventDescription TEXT NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sessionId) REFERENCES Session (id) ON DELETE CASCADE,
        FOREIGN KEY (campaignId) REFERENCES Campaign (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS PlayerCharacter (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        class TEXT,
        archetype TEXT,
        strength INTEGER,
        dexterity INTEGER,
        constitution INTEGER,
        intelligence INTEGER,
        wisdom INTEGER,
        charisma INTEGER,
        background TEXT,
        imageUrl TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        campaignId TEXT NOT NULL,
        race TEXT,
        level INTEGER,
        hitPoints INTEGER,
        armorClass INTEGER,
        skills TEXT,
        spells TEXT,
        pact TEXT,
        school TEXT,
        domain TEXT,
        traits TEXT,
        ideals TEXT,
        bonds TEXT,
        flaws TEXT,
        FOREIGN KEY (campaignId) REFERENCES Campaign (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS CustomSpell (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        level TEXT,
        school TEXT,
        casting_time TEXT,
        range TEXT,
        components TEXT,
        duration TEXT,
        description TEXT,
        classes TEXT,
        campaignId TEXT NOT NULL,
        FOREIGN KEY (campaignId) REFERENCES Campaign (id) ON DELETE CASCADE,
        UNIQUE(name, campaignId)
    );

    CREATE TABLE IF NOT EXISTS CustomSkill (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        ability TEXT,
        description TEXT,
        campaignId TEXT NOT NULL,
        FOREIGN KEY (campaignId) REFERENCES Campaign (id) ON DELETE CASCADE,
        UNIQUE(name, campaignId)
    );

    CREATE TABLE IF NOT EXISTS PossessedItems (
        campaignId TEXT NOT NULL,
        itemName TEXT NOT NULL,
        PRIMARY KEY (campaignId, itemName),
        FOREIGN KEY (campaignId) REFERENCES Campaign (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS LetterPreset (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        settings TEXT NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS Shop (
        id TEXT PRIMARY KEY,
        campaignId TEXT NOT NULL,
        name TEXT NOT NULL,
        owner TEXT,
        description TEXT,
        inventory TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaignId) REFERENCES Campaign (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS WorldLocation (
        id TEXT PRIMARY KEY,
        campaignId TEXT NOT NULL,
        name TEXT NOT NULL,
        scale TEXT,
        style TEXT,
        atmosphere TEXT,
        details TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaignId) REFERENCES Campaign (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Npc (
        id TEXT PRIMARY KEY,
        campaignId TEXT NOT NULL,
        name TEXT NOT NULL,
        race TEXT,
        gender TEXT,
        age TEXT,
        status TEXT,
        alignment TEXT,
        details TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaignId) REFERENCES Campaign (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Combat (
        id TEXT PRIMARY KEY,
        campaignId TEXT NOT NULL,
        name TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        details TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaignId) REFERENCES Campaign (id) ON DELETE CASCADE
    );
`);

// MIGRATIONS & DATA INTEGRITY
const runDataMigrations = () => {
    try {
        // Aggiungi colonne se mancano
        try { db.exec("ALTER TABLE Campaign ADD COLUMN global_compendium TEXT"); } catch(e) {}
        try { db.exec("ALTER TABLE Campaign ADD COLUMN active_arc_label TEXT DEFAULT 'Arco Narrativo Attivo'"); } catch(e) {}
        try { db.exec("ALTER TABLE Session ADD COLUMN arcId TEXT REFERENCES StoryArc (id) ON DELETE SET NULL"); } catch(e) {}
        try { db.exec("ALTER TABLE Session ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT 0"); } catch(e) {}
        try { db.exec("ALTER TABLE Session ADD COLUMN is_summarized BOOLEAN NOT NULL DEFAULT 0"); } catch(e) {}
        try { db.exec("ALTER TABLE StoryArc ADD COLUMN world_impact TEXT"); } catch(e) {}

        // Assicura che ogni campagna abbia un Arco Attivo e che le sessioni siano collegate
        const campaigns = db.prepare("SELECT id FROM Campaign").all() as { id: string }[];
        for (const campaign of campaigns) {
            let activeArc = db.prepare("SELECT id FROM StoryArc WHERE campaignId = ? AND status = 'active'").get(campaign.id) as { id: string } | undefined;
            
            if (!activeArc) {
                const arcId = randomUUID();
                const now = new Date().toISOString();
                db.prepare(`
                    INSERT INTO StoryArc (id, campaignId, title, status, order_index, createdAt, updatedAt)
                    VALUES (?, ?, ?, 'active', 0, ?, ?)
                `).run(arcId, campaign.id, "Atto Iniziale", now, now);
                activeArc = { id: arcId };
            }
            
            // Collega TUTTE le sessioni senza arco all'arco attivo
            db.prepare("UPDATE Session SET arcId = ? WHERE campaignId = ? AND arcId IS NULL").run(activeArc.id, campaign.id);
        }
        console.log("[DB] Migrazione Archi Narrativi completata con successo.");
    } catch (e) {
        console.error("[DB] Errore durante la migrazione dei dati:", e);
    }
};

runDataMigrations();

export default db;
