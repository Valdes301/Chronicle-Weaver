
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
