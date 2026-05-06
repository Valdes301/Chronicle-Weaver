import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

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

try { db.exec("ALTER TABLE MagicItem ADD COLUMN imageUrl TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE Monster ADD COLUMN imageUrl TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE PlayerCharacter ADD COLUMN imageUrl TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE MagicItem ADD COLUMN damage TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE MagicItem ADD COLUMN techType TEXT"); } catch(e) {}

// SCRIPT DI RIPARAZIONE AVANZATA: Corregge il danno, la CA e la natura dell'effetto
const repairDatabaseItems = () => {
    try {
        const commonPath = path.join(process.cwd(), 'src/lib/dnd-data/common-items.json');
        const magicPath = path.join(process.cwd(), 'src/lib/dnd-data/magic-items.json');
        const equipPath = path.join(process.cwd(), 'src/lib/dnd-data/equipment.json');
        
        const commonItems = fs.existsSync(commonPath) ? JSON.parse(fs.readFileSync(commonPath, 'utf8')).commonItems : [];
        const magicItems = fs.existsSync(magicPath) ? JSON.parse(fs.readFileSync(magicPath, 'utf8')).magicItems : [];
        const equipData = fs.existsSync(equipPath) ? JSON.parse(fs.readFileSync(equipPath, 'utf8')) : { armor: [], weapons: [], magicWeapons: [], magicArmor: [] };
        
        const allRefs = [
            ...commonItems, 
            ...magicItems, 
            ...(equipData.weapons || []), 
            ...(equipData.magicWeapons || []), 
            ...(equipData.armor || []),
            ...(equipData.magicArmor || [])
        ];

        const refMap = new Map();
        allRefs.forEach((item: any) => {
            const techValue = item.damage || item.armorClass;
            if (techValue && techValue.trim()) {
                refMap.set(item.name.toLowerCase(), { value: techValue, type: item.techType });
            }
        });

        // Ripara Danno e CA
        const itemsToRepair = db.prepare("SELECT id, name, type, description, damage, techType FROM MagicItem WHERE damage IS NULL OR damage = '' OR techType IS NULL OR techType = ''").all() as any[];
        
        if (itemsToRepair.length > 0) {
            console.log(`[Database] Trovati ${itemsToRepair.length} oggetti incompleti. Avvio riparazione...`);
            const updateStmt = db.prepare("UPDATE MagicItem SET damage = ?, techType = ? WHERE id = ?");
            
            db.transaction(() => {
                for (const item of itemsToRepair) {
                    let techValue = item.damage;
                    let techType = item.techType;
                    
                    const ref = refMap.get(item.name.toLowerCase());
                    if (ref) {
                        if (!techValue) techValue = ref.value;
                        if (!techType) techType = ref.type;
                    }
                    
                    // Se ancora manca, inferenza intelligente
                    if (!techValue && item.description) {
                        const acMatch = item.description.match(/(?:Classe Armatura|CA|AC)\s*:?\s*([+\d]+(?:\s*\+\s*[a-zA-Z]+)?)/i);
                        if (acMatch) {
                            techValue = acMatch[1].trim();
                            if (!techValue.toLowerCase().includes('ca')) techValue = `CA ${techValue}`;
                            if (!techType) techType = 'defense';
                        } else {
                            const diceMatch = item.description.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?(?:\s*[a-zA-Zàèéìòù]+)?)/i);
                            if (diceMatch) {
                                techValue = diceMatch[1].trim();
                                if (!techType) {
                                    const desc = item.description.toLowerCase();
                                    if (desc.includes('cura') || desc.includes('guarigione')) techType = 'cure';
                                    else techType = 'damage';
                                }
                            }
                        }
                    }

                    // Ultime rifiniture cariche e tipi
                    if (!techType && techValue) {
                        const nameLower = item.name.toLowerCase();
                        const typeLower = (item.type || '').toLowerCase();
                        if (nameLower.includes('cariche') || item.description?.toLowerCase().includes('cariche')) techType = 'charges';
                        else if (typeLower.includes('armatura') || typeLower.includes('scudo') || nameLower.includes('protezione')) techType = 'defense';
                        else if (typeLower.includes('pozione') || typeLower.includes('olio')) techType = 'alchemy';
                        else techType = 'damage';
                    }

                    if (techValue || techType) {
                        updateStmt.run(techValue || '', techType || 'damage', item.id);
                    }
                }
            })();
            console.log("[Database] Riparazione completata.");
        }
    } catch (e) {
        console.error("Errore durante la migrazione dei dati tecnici:", e);
    }
};

repairDatabaseItems();

export default db;