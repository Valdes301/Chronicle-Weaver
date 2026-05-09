
// Previously these were Prisma types. Now we define them manually.
export interface Campaign {
    id: string;
    name: string;
    setting: string;
    description: string | null;
    summary: string | null; // This now acts as the "Active Context"
    global_compendium: string | null; // The sum of all archived arc summaries
    active_arc_label: string | null; // Custom label for "Active Story Arc"
    player_characters: string | null; // Old field, for migration.
    createdAt: string; // ISO string
    updatedAt: string; // ISO string
}

export interface StoryArc {
    id: string;
    campaignId: string;
    title: string;
    summary: string | null;
    world_impact: string | null; // New field for RPG flavour
    status: 'active' | 'archived';
    order_index: number;
    createdAt: string;
    updatedAt: string;
}

export interface Session {
    id: string;
    session_number: number;
    title: string;
    notes: string | null;
    xp_award: number | null;
    source: 'generated' | 'imported';
    createdAt: string;
    updatedAt: string;
    campaignId: string;
    arcId: string; // Reference to the StoryArc
    is_read: boolean;
    loot_scanned: boolean;
    is_archived: boolean;
}

export interface Armor {
  name: string;
  type: string;
  cost: string;
  armorClass: string;
  strength: string;
  stealth: string;
  weight: string;
  rarity: string;
}

export interface Weapon {
  name: string;
  type: string;
  cost: string;
  damage: string;
  weight: string;
  properties: string;
  rarity: string;
}

export type TechType = 'damage' | 'defense' | 'cure' | 'alchemy' | 'charges' | 'reward' | 'none';

export interface MagicItem {
    id?: string;
    campaignId?: string;
    name: string;
    type: string;
    rarity: string;
    attunement?: string;
    description: string;
    cost?: string | null;
    damage?: string | null;
    techType?: TechType;
    imageUrl?: string | null;
    source?: 'base' | 'created';
}

export interface Monster {
    id?: string;
    campaignId?: string;
    name: string;
    type?: string;
    armorClass?: string;
    hitPoints?: string;
    challenge?: string;
    description?: string;
    imageUrl?: string | null;
    source?: 'base' | 'created';
}

export interface Reward {
    id: string;
    campaignId: string;
    sessionId: string;
    name: string;
    description: string;
}

export interface CharacterEvent {
    id: string;
    characterId: string;
    characterType: 'pc' | 'npc';
    sessionId: string;
    campaignId: string;
    eventDescription: string;
    createdAt: string;
}

export interface Spell {
  id?: string;
  campaignId?: string;
  name: string;
  level?: string;
  school?: string;
  casting_time?: string;
  range?: string;
  components?: string;
  duration?: string;
  description?: string;
  classes?: string;
  source?: 'base' | 'created';
}

export interface Skill {
  id?: string;
  campaignId?: string;
  name: string;
  ability?: string;
  description?: string;
  source?: 'base' | 'created';
}

export interface PlayerCharacter {
    id: string;
    campaignId: string;
    name: string;
    race?: string | null;
    class?: string | null;
    archetype?: string | null;
    level?: number | null;
    hitPoints?: number | null;
    armorClass?: number | null;
    strength?: number | null;
    dexterity?: number | null;
    constitution?: number | null;
    intelligence?: number | null;
    wisdom?: number | null;
    charisma?: number | null;
    background?: string | null;
    imageUrl?: string | null;
    skills?: string | null; // JSON array of skill names
    spells?: string | null; // Comma-separated spell names
    pact?: string | null;
    school?: string | null;
    domain?: string | null;
    traits?: string | null;
    ideals?: string | null;
    bonds?: string | null;
    flaws?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface LetterPreset {
    id: string;
    name: string;
    settings: string; // JSON string with font names, sizes, etc.
    createdAt: string;
}

export interface ShopItem {
    name: string;
    type: string;
    rarity: string;
    cost: string;
    damage?: string | null;
    techType?: TechType;
    description: string;
    source: 'database' | 'ai';
}

export interface Shop {
    id: string;
    campaignId: string;
    name: string;
    owner: string | null;
    description: string | null;
    inventory: string; // JSON string of ShopItem[]
    createdAt: string;
    updatedAt: string;
}

export interface WorldLocation {
    id: string;
    campaignId: string;
    name: string;
    scale: string;
    style: string;
    atmosphere: string;
    details: string; // JSON string of LocationDetails
    createdAt: string;
    updatedAt: string;
}

export interface LocationDetails {
    title: string;
    sight: string;
    sound: string;
    smell: string;
    pointsOfInterest: string[];
    secret: string;
}

export interface NpcDetails {
    name: string;
    race: string;
    occupation: string;
    appearance: string;
    personality: string;
    mannerism: string;
    secret: string;
    encounterHook: string;
}

export interface Npc {
    id: string;
    campaignId: string;
    name: string;
    race: string;
    gender: string;
    age: string;
    status: string;
    alignment: string;
    details: string; // JSON string of NpcDetails
    createdAt: string;
    updatedAt: string;
}

export interface CombatUnit {
    quantity: number;
    race: string;
    role: string;
}

export interface CombatDetails {
    title: string;
    scenario: string;
    enemies: {
        name: string;
        quantity: number;
        stats: string;
        description: string;
    }[];
    strategy: string;
    xpTotal: number;
}

export interface Combat {
    id: string;
    campaignId: string;
    name: string;
    difficulty: string;
    details: string; // JSON string of CombatDetails
    createdAt: string;
    updatedAt: string;
}

// AI Input Types
export interface GenerateCombatInput {
    difficulty: 'Facile' | 'Medio' | 'Difficile' | 'Mortale';
    units: CombatUnit[];
    environment?: string;
    campaignSummary?: string;
}

export interface GenerateNpcInput {
    gender: 'Maschio' | 'Femmina' | 'Non binario';
    age: 'Bambino' | 'Ragazzo' | 'Adulto' | 'Vecchio';
    status: 'Miserabile' | 'Povero' | 'Normale' | 'Ricco' | 'Sfarzoso' | 'Nobile';
    alignment: 'Buono' | 'Neutrale' | 'Malvagio';
    race?: string;
    campaignSummary?: string;
}

export interface GenerateShopInput {
    shopType: 'Alchimista' | 'Armaiolo' | 'Emporio Magico' | 'Bernard' | 'Contrabbandiere' | 'Mercante Generale' | 'Mercante Itinerante' | 'Truffatore';
    campaignSummary?: string;
    numAiItems: number;
    generateCursed?: boolean;
}

export interface GenerateLocationInput {
    scale: 'Micro (Stanza, Vicolo)' | 'Medio (Quartiere, Piazza, Taverna)' | 'Macro (Villaggio, Dungeon, Foresta)';
    style: 'Ricco' | 'Povero' | 'Decadente' | 'Sfarzoso' | 'Diroccato' | 'Incontaminato' | 'In costruzione';
    atmosphere: 'Sinistro' | 'Accogliente' | 'Caotico' | 'Silenzioso' | 'Magico' | 'Misterioso';
    population: 'Affollato' | 'Deserto' | 'Abitato da mostri' | 'Solo PNG ostili' | 'Tranquillo';
    campaignSummary?: string;
}

export interface GenerateTreasureInput {
  location: string;
  valueType: 'Random (Scarso)' | 'Random (Medio)' | 'Random (Ricco)' | 'Specifico';
  specificGold?: number;
  allowedTypes: string[];
  quantity: number;
  campaignSummary?: string;
}

export interface TreasureItem {
  name: string;
  type: string;
  rarity: string;
  description: string;
  cost: string;
  isCursed: boolean;
  techType: TechType;
}

export interface GenerateTreasureOutput {
  title: string;
  items: TreasureItem[];
}

// This type includes all relations, for use when we fetch a campaign with its sessions, items, etc.
export type CampaignWithRelations = Campaign & {
    activeArc: StoryArc | null;
    sessions: Session[]; // Current Active sessions
    magicItems: MagicItem[];
    monsters: Monster[];
    playerCharacters: PlayerCharacter[];
    worldLocations: WorldLocation[];
    npcs: Npc[];
    combats: Combat[];
};
