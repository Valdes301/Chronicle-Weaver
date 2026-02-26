
// Previously these were Prisma types. Now we define them manually.
export interface Campaign {
    id: string;
    name: string;
    setting: string;
    description: string | null;
    summary: string | null;
    player_characters: string | null; // Old field, for migration.
    createdAt: string; // ISO string
    updatedAt: string; // ISO string
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
    is_read: boolean;
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

export interface MagicItem {
    id?: string;
    campaignId?: string;
    name: string;
    type: string;
    rarity: string;
    attunement?: string;
    description: string;
    cost?: string | null;
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
    source?: 'base' | 'created';
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

// This type includes all relations, for use when we fetch a campaign with its sessions, items, etc.
export type CampaignWithRelations = Campaign & {
    sessions: Session[];
    magicItems: MagicItem[];
    monsters: Monster[];
    playerCharacters: PlayerCharacter[];
};
