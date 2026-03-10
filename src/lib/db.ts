import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Percorso assoluto all'interno del container Docker (mappato nel volume)
const dataDir = '/app/data';

// Assicuriamoci che la cartella dei dati esista all'avvio
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Determiniamo il percorso del file database
const dbPath = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace('file:', '')
  : path.join(dataDir, 'dev.db');

const db = new Database(dbPath);

// Ottimizzazioni per SQLite (WAL mode migliora le performance in lettura/scrittura simultanea)
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('temp_store = MEMORY');
db.pragma('foreign_keys = ON');

// --- GESTIONE MIGRAZIONI MANUALI ---
// Questo blocco aggiunge colonne esistenti se il DB è già presente ma datato

try {
    const sessionTableInfo = db.prepare(`PRAGMA table_info(Session)`).all() as { name: string }[];
    const sessionColumnNames = sessionTableInfo.map(col => col.name);
    if (sessionColumnNames.length > 0 && !sessionColumnNames.includes('is_read')) {
        db.prepare(`ALTER TABLE Session ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT 0`).run();
    }
} catch (error) {
    console.log("Tabella Session non ancora presente, verrà creata dopo.");
}

try {
    const tableInfo = db.prepare(`PRAGMA table_info(PlayerCharacter)`).all() as { name: string }[];
    const columnNames = tableInfo.map(col => col.name);
    
    if (columnNames.length > 0) {
        const columnsToAdd = [
            { name: 'race', type: 'TEXT' },
            { name: 'level', type: 'INTEGER' },
            { name: 'hitPoints', type: 'INTEGER' },
            { name: 'armorClass', type: 'INTEGER' },
            { name: 'skills', type: 'TEXT' },
            { name: 'spells', type: 'TEXT' },
            { name: 'pact', type: 'TEXT' },
            { name: 'school', type: 'TEXT' },
            { name: 'domain', type: 'TEXT' },
            { name: 'traits', type: 'TEXT' },
            { name: 'ideals', type: 'TEXT' },
            { name: 'bonds', type: 'TEXT' },
            { name: 'flaws', type: 'TEXT' },
        ];

        db.transaction(() => {
            for (const col of columnsToAdd) {
                if (!columnNames.includes(col.name)) {
                    db.prepare(`ALTER TABLE PlayerCharacter ADD COLUMN ${col.name} ${col.type}`).run();
                }
            }
        })();
    }
} catch (error) {
    console.log("Tabella PlayerCharacter non ancora presente.");
}

try {
    const magicItemTableInfo = db.prepare(`PRAGMA table_info(MagicItem)`).all() as { name: string }[];
    const magicItemCols = magicItemTableInfo.map(c => c.name);
    if (magicItemCols.length > 0 && !magicItemCols.includes('cost')) {
        db.prepare(`ALTER TABLE MagicItem ADD COLUMN cost TEXT`).run();
    }
} catch (error) {
    console.log("Tabella MagicItem non ancora presente.");
}

// --- CREAZIONE TABELLE (SCHEMA INIZIALE) ---
db.exec(`
    CREATE TABLE IF NOT EXISTS Campaign (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        setting TEXT NOT NULL,
        description TEXT,
        summary TEXT,
        player_characters TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS Session (
        id TEXT PRIMARY KEY,
        session_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        notes TEXT,
        xp_award INTEGER DEFAULT 0,
        source TEXT NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        campaignId TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT 0,
        FOREIGN KEY (campaignId) REFERENCES Campaign (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS MagicItem (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT,
        rarity TEXT,
        attunement TEXT,
        description TEXT,
        cost TEXT,
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
        campaignId TEXT NOT NULL,
        FOREIGN KEY (campaignId) REFERENCES Campaign (id) ON DELETE CASCADE,
        UNIQUE(name, campaignId)
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
`);

export default db;
