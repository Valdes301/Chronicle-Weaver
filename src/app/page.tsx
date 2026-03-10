import { CampaignManager } from '@/components/campaign-manager';
import equipmentData from '@/lib/dnd-data/equipment.json';
import magicItemData from '@/lib/dnd-data/magic-items.json';
import commonItemData from '@/lib/dnd-data/common-items.json';
import monsterData from '@/lib/dnd-data/monsters.json';
import spellData from '@/lib/dnd-data/spells.json';
import skillsData from '@/lib/dnd-data/skills.json';
import db from '@/lib/db';
import type { MagicItem, Monster, Spell, Weapon, Armor, Skill, CampaignWithRelations, Session, Campaign, PlayerCharacter } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function getCampaignsData(activeCampaignId?: string): Promise<{ 
    campaigns: Campaign[], 
    activeCampaign: Campaign | null, 
    sessions: Session[], 
    magicItems: MagicItem[], 
    monsters: Monster[], 
    playerCharacters: PlayerCharacter[], 
    customSpells: Spell[], 
    customSkills: Skill[],
    possessedItems: string[]
}> {
    try {
        const campaigns = db.prepare('SELECT * FROM Campaign ORDER BY updatedAt DESC').all() as Campaign[];
        if (!campaigns || campaigns.length === 0) {
            return { campaigns: [], activeCampaign: null, sessions: [], magicItems: [], monsters: [], playerCharacters: [], customSpells: [], customSkills: [], possessedItems: [] };
        }

        let activeCampaignData: Campaign | undefined;
        if (activeCampaignId) {
            activeCampaignData = campaigns.find(c => c.id === activeCampaignId);
        }
        
        if (!activeCampaignData) {
            activeCampaignData = campaigns[0];
        }

        const sessions = db.prepare('SELECT * FROM Session WHERE campaignId = ? ORDER BY session_number ASC').all(activeCampaignData.id) as Session[];
        const magicItems = db.prepare('SELECT * FROM MagicItem WHERE campaignId = ?').all(activeCampaignData.id) as MagicItem[];
        const monsters = db.prepare('SELECT * FROM Monster WHERE campaignId = ?').all(activeCampaignData.id) as Monster[];
        const playerCharacters = db.prepare('SELECT * FROM PlayerCharacter WHERE campaignId = ? ORDER BY name ASC').all(activeCampaignData.id) as PlayerCharacter[];
        const customSpells = db.prepare('SELECT * FROM CustomSpell WHERE campaignId = ?').all(activeCampaignData.id) as Spell[];
        const customSkills = db.prepare('SELECT * FROM CustomSkill WHERE campaignId = ?').all(activeCampaignData.id) as Skill[];
        const possessedItems = db.prepare('SELECT itemName FROM PossessedItems WHERE campaignId = ?').all(activeCampaignData.id) as { itemName: string }[];
        
        return { campaigns, activeCampaign: activeCampaignData, sessions, magicItems, monsters, playerCharacters, customSpells, customSkills, possessedItems: possessedItems.map(i => i.itemName) };

    } catch (error) {
        console.error("Database error in getCampaignsData:", error);
        return { campaigns: [], activeCampaign: null, sessions: [], magicItems: [], monsters: [], playerCharacters: [], customSpells: [], customSkills: [], possessedItems: [] };
    }
}

const uniqueByName = <T extends { name: string; source?: 'base' | 'created' }>(baseItems: T[], createdItems: T[]): T[] => {
    const map = new Map<string, T>();
    for (const item of createdItems) {
        map.set(item.name.toLowerCase(), { ...item, source: 'created' as const });
    }
    for (const item of baseItems) {
        const key = item.name.toLowerCase();
        if (!map.has(key)) {
            map.set(key, { ...item, source: 'base' as const });
        }
    }
    return Array.from(map.values());
};

// FIX PER NEXT.JS 15: searchParams è ora una Promise
export default async function Page(props: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Aspettiamo la risoluzione della Promise per leggere i dati
  const searchParams = await props.searchParams;
  
  const campaignId = typeof searchParams?.campaignId === 'string' ? searchParams.campaignId : undefined;
  const initialView = typeof searchParams?.view === 'string' ? searchParams.view : undefined;

  const { campaigns, activeCampaign, sessions, magicItems: createdMagicItems, monsters: createdMonsters, playerCharacters, customSpells, customSkills, possessedItems } = await getCampaignsData(campaignId);

  const activeCampaignWithRelations: CampaignWithRelations | null = activeCampaign ? {
    ...activeCampaign,
    sessions,
    magicItems: createdMagicItems,
    monsters: createdMonsters,
    playerCharacters
  } : null;

  const baseSpells: Spell[] = spellData.spells.map(s => ({ ...s, source: 'base' as const }));
  const allArmor: Armor[] = equipmentData.armor;
  const allWeapons: Weapon[] = equipmentData.weapons;
  const baseSkills: Skill[] = skillsData.skills.map(s => ({...s, source: 'base' as const}));

  const baseItems: MagicItem[] = [
    ...(commonItemData.commonItems as MagicItem[]),
    ...magicItemData.magicItems,
    ...(equipmentData as any).magicArmor || [],
    ...(equipmentData as any).magicWeapons || [],
  ];
  
  const allItems = uniqueByName(baseItems, createdMagicItems.map(i => ({...i, type: i.type ?? '', rarity: i.rarity ?? '', attunement: i.attunement ?? 'No', description: i.description ?? '', cost: i.cost ?? '', source: 'created'})));
  const allMonsters = uniqueByName(monsterData.monsters, createdMonsters.map(m => ({...m, type: m.type ?? '', armorClass: m.armorClass ?? '', hitPoints: m.hitPoints ?? '', challenge: m.challenge ?? '', description: m.description ?? '', source: 'created'})));
  const allSpells = uniqueByName(baseSpells, customSpells.map(s => ({...s, level: s.level ?? '', school: s.school ?? '', casting_time: s.casting_time ?? '', range: s.range ?? '', components: s.components ?? '', duration: s.duration ?? '', description: s.description ?? '', classes: s.classes ?? '', source: 'created'})));
  const allSkills = uniqueByName(baseSkills, customSkills.map(s => ({...s, ability: s.ability ?? '', description: s.description ?? '', source: 'created'})));
  
  const itemsForDb = allItems.filter(i => !['Armatura', 'Arma', 'Scudo'].some(type => i.type.toLowerCase().includes(type.toLowerCase())));
  const magicArmor = allItems.filter(i => i.type.toLowerCase().includes('armatura') || i.type.toLowerCase().includes('scudo'));
  const magicWeapons = allItems.filter(i => i.type.toLowerCase().includes('arma'));

  return (
    <CampaignManager
      campaigns={campaigns}
      activeCampaign={activeCampaignWithRelations}
      initialView={initialView}
      sessions={sessions ?? []}
      dbMagicItems={itemsForDb}
      dbMonsters={allMonsters}
      dbSpells={allSpells}
      allArmor={allArmor}
      allWeapons={allWeapons}
      magicArmor={magicArmor}
      magicWeapons={magicWeapons}
      skills={allSkills}
      possessedItems={possessedItems}
      allItems={allItems}
    />
  );
}