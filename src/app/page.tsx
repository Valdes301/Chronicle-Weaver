
import { CampaignManager } from '@/components/campaign-manager';
import equipmentData from '@/lib/dnd-data/equipment.json';
import magicItemData from '@/lib/dnd-data/magic-items.json';
import commonItemData from '@/lib/dnd-data/common-items.json';
import monsterData from '@/lib/dnd-data/monsters.json';
import spellData from '@/lib/dnd-data/spells.json';
import skillsData from '@/lib/dnd-data/skills.json';
import db from '@/lib/db';
import type { MagicItem, Monster, Spell, Weapon, Armor, Skill, CampaignWithRelations, Session, Campaign, PlayerCharacter, LetterPreset, Shop, WorldLocation, Npc, Combat, StoryArc } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function getCampaignsData(activeCampaignId?: string): Promise<{ 
    campaigns: Campaign[], 
    activeCampaign: Campaign | null,
    activeArc: StoryArc | null,
    sessions: Session[], 
    magicItems: MagicItem[], 
    monsters: Monster[], 
    playerCharacters: PlayerCharacter[], 
    customSpells: Spell[], 
    customSkills: Skill[],
    possessedItems: string[],
    letterPresets: LetterPreset[],
    shops: Shop[],
    worldLocations: WorldLocation[],
    npcs: Npc[],
    combats: Combat[]
}> {
    try {
        const campaigns = db.prepare('SELECT * FROM Campaign ORDER BY updatedAt DESC').all() as Campaign[];
        const letterPresets = db.prepare('SELECT * FROM LetterPreset ORDER BY createdAt DESC').all() as LetterPreset[];
        
        if (!campaigns || campaigns.length === 0) {
            return { campaigns: [], activeCampaign: null, activeArc: null, sessions: [], magicItems: [], monsters: [], playerCharacters: [], customSpells: [], customSkills: [], possessedItems: [], letterPresets, shops: [], worldLocations: [], npcs: [], combats: [] };
        }

        let activeCampaignData: Campaign | undefined;
        if (activeCampaignId) {
            activeCampaignData = campaigns.find(c => c.id === activeCampaignId);
        }
        
        if (!activeCampaignData) {
            activeCampaignData = campaigns[0];
        }

        const activeArc = db.prepare("SELECT * FROM StoryArc WHERE campaignId = ? AND status = 'active'").get(activeCampaignData.id) as StoryArc;
        
        // Dashboard: Carichiamo le sessioni dell'arco attivo che NON sono archiviate.
        // Se per qualche motivo l'arco attivo non ha sessioni visibili, carichiamo comunque le sessioni non archiviate della campagna per sicurezza.
        let sessions = activeArc 
            ? db.prepare('SELECT * FROM Session WHERE campaignId = ? AND arcId = ? AND is_archived = 0 ORDER BY session_number ASC').all(activeCampaignData.id, activeArc.id) as Session[]
            : [];
            
        if (sessions.length === 0) {
            sessions = db.prepare('SELECT * FROM Session WHERE campaignId = ? AND is_archived = 0 ORDER BY session_number ASC').all(activeCampaignData.id) as Session[];
        }

        const magicItems = db.prepare('SELECT * FROM MagicItem WHERE campaignId = ?').all(activeCampaignData.id) as MagicItem[];
        const monsters = db.prepare('SELECT * FROM Monster WHERE campaignId = ?').all(activeCampaignData.id) as Monster[];
        const playerCharacters = db.prepare('SELECT * FROM PlayerCharacter WHERE campaignId = ? ORDER BY name ASC').all(activeCampaignData.id) as PlayerCharacter[];
        const customSpells = db.prepare('SELECT * FROM CustomSpell WHERE campaignId = ?').all(activeCampaignData.id) as Spell[];
        const customSkills = db.prepare('SELECT * FROM CustomSkill WHERE campaignId = ?').all(activeCampaignData.id) as Skill[];
        const possessedItems = db.prepare('SELECT itemName FROM PossessedItems WHERE campaignId = ?').all(activeCampaignData.id) as { itemName: string }[];
        const shops = db.prepare('SELECT * FROM Shop WHERE campaignId = ? ORDER BY updatedAt DESC').all(activeCampaignData.id) as Shop[];
        const worldLocations = db.prepare('SELECT * FROM WorldLocation WHERE campaignId = ? ORDER BY updatedAt DESC').all(activeCampaignData.id) as WorldLocation[];
        const npcs = db.prepare('SELECT * FROM Npc WHERE campaignId = ? ORDER BY updatedAt DESC').all(activeCampaignData.id) as Npc[];
        const combats = db.prepare('SELECT * FROM Combat WHERE campaignId = ? ORDER BY updatedAt DESC').all(activeCampaignData.id) as Combat[];
        
        return { campaigns, activeCampaign: activeCampaignData, activeArc, sessions, magicItems, monsters, playerCharacters, customSpells, customSkills, possessedItems: possessedItems.map(i => i.itemName), letterPresets, shops, worldLocations, npcs, combats };

    } catch (error) {
        console.error("Database error in getCampaignsData:", error);
        return { campaigns: [], activeCampaign: null, activeArc: null, sessions: [], magicItems: [], monsters: [], playerCharacters: [], customSpells: [], customSkills: [], possessedItems: [], letterPresets: [], shops: [], worldLocations: [], npcs: [], combats: [] };
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

export default async function Page(props: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  
  const campaignId = typeof searchParams?.campaignId === 'string' ? searchParams.campaignId : undefined;
  const initialView = typeof searchParams?.view === 'string' ? searchParams.view : undefined;

  const { campaigns, activeCampaign, activeArc, sessions, magicItems: createdMagicItems, monsters: createdMonsters, playerCharacters, customSpells, customSkills, possessedItems, letterPresets, shops, worldLocations, npcs, combats } = await getCampaignsData(campaignId);

  const activeCampaignWithRelations: CampaignWithRelations | null = activeCampaign ? {
    ...activeCampaign,
    activeArc,
    sessions,
    magicItems: createdMagicItems,
    monsters: createdMonsters,
    playerCharacters,
    worldLocations,
    npcs,
    combats
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
  
  const mappedCreatedItems = createdMagicItems.map(i => ({
      ...i, 
      type: i.type ?? 'Oggetto meraviglioso', 
      rarity: i.rarity ?? 'Comune', 
      attunement: i.attunement ?? 'No', 
      description: i.description ?? '', 
      cost: i.cost ?? 'N/D', 
      damage: i.damage ?? '', 
      techType: i.techType ?? 'damage',
      imageUrl: i.imageUrl || '', 
      source: 'created' as const
  }));

  const allItems = uniqueByName(baseItems, mappedCreatedItems);
  
  const allMonsters = uniqueByName(monsterData.monsters, createdMonsters.map(m => ({...m, type: m.type ?? '', armorClass: m.armorClass ?? '', hitPoints: m.hitPoints ?? '', challenge: m.challenge ?? '', description: m.description ?? '', imageUrl: m.imageUrl || '', source: 'created'})));
  const allSpells = uniqueByName(baseSpells, customSpells.map(s => ({...s, level: s.level ?? '', school: s.school ?? '', casting_time: s.casting_time ?? '', range: s.range ?? '', components: s.components ?? '', duration: s.duration ?? '', description: s.description ?? '', classes: s.classes ?? '', source: 'created'})));
  const allSkills = uniqueByName(baseSkills, customSkills.map(s => ({...s, ability: s.ability ?? '', description: s.description ?? '', source: 'created'})));
  
  const itemsForDb = allItems.filter(i => !['Armatura', 'Arma', 'Scudo'].some(type => (i.type || '').toLowerCase().includes(type.toLowerCase())));
  const magicArmor = allItems.filter(i => (i.type || '').toLowerCase().includes('armatura') || (i.type || '').toLowerCase().includes('scudo'));
  const magicWeapons = allItems.filter(i => (i.type || '').toLowerCase().includes('arma'));

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
      letterPresets={letterPresets}
      shops={shops}
      worldLocations={worldLocations}
      npcs={npcs}
      combats={combats}
    />
  );
}
