'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { Campaign, CampaignWithRelations, Session, MagicItem, Monster, Spell, Skill, PlayerCharacter, Weapon, Armor, LetterPreset, Shop, WorldLocation, Npc, Combat } from '@/lib/types';
import { CampaignInitializer } from '@/components/campaign-initializer';
import { CampaignDashboard } from '@/components/campaign-dashboard';
import * as actions from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { 
    Check, 
    Loader2, 
    Beer, 
    LibraryBig, 
    BookUser, 
    Hammer, 
    Library, 
    BrainCircuit, 
    Shield, 
    Sparkles, 
    Skull, 
    Wand, 
    Map, 
    Mail, 
    Store, 
    MapPin, 
    UserCircle, 
    Sword, 
    LayoutGrid, 
    Palette, 
    Settings,
    Pencil,
    ChevronsUpDown,
    Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarProvider, SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { SidebarNav } from './sidebar-nav';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Icons } from './icons';

const EquipmentDb = dynamic(() => import('./equipment-db').then(m => m.EquipmentDb), { ssr: false });
const ItemsDb = dynamic(() => import('./items-db').then(m => m.ItemsDb), { ssr: false });
const MonstersDb = dynamic(() => import('./monsters-db').then(m => m.MonstersDb), { ssr: false });
const SpellsDb = dynamic(() => import('./spells-db').then(m => m.SpellsDb), { ssr: false });
const SkillsDb = dynamic(() => import('./skills-db').then(m => m.SkillsDb), { ssr: false });
const MapGenerator = dynamic(() => import('./map-generator').then(m => m.MapGenerator), { ssr: false });
const CatalogHandbook = dynamic(() => import('./catalog-handbook').then(m => m.CatalogHandbook), { ssr: false });
const UnifiedCardGenerator = dynamic(() => import('./unified-card-generator').then(m => m.UnifiedCardGenerator), { ssr: false });
const ExperimentalCardGenerator = dynamic(() => import('./experimental-card-generator').then(m => m.ExperimentalCardGenerator), { ssr: false });
const CardBackgroundUploader = dynamic(() => import('./card-background-uploader').then(m => m.CardBackgroundUploader), { ssr: false });
const LetterGenerator = dynamic(() => import('./letter-generator').then(m => m.LetterGenerator), { ssr: false });
const ShopManager = dynamic(() => import('./shop-manager').then(m => m.ShopManager), { ssr: false });
const WorldArchitect = dynamic(() => import('./world-architect').then(m => m.WorldArchitect), { ssr: false });
const NpcGenerator = dynamic(() => import('./npc-generator').then(m => m.NpcGenerator), { ssr: false });
const CombatGenerator = dynamic(() => import('./combat-generator').then(m => m.CombatGenerator), { ssr: false });
const TreasureGenerator = dynamic(() => import('./treasure-generator').then(m => m.TreasureGenerator), { ssr: false });
const NpcSummary = dynamic(() => import('./npc-summary').then(m => m.NpcSummary), { ssr: false });
const PlayerCharactersDb = dynamic(() => import('./player-characters-db').then(m => m.PlayerCharactersDb), { ssr: false });
const ArchiveView = dynamic(() => import('./archive-view').then(m => m.ArchiveView), { ssr: false });
const SettingsView = dynamic(() => import('./settings-view').then(m => m.SettingsView), { ssr: false });
const HomebrewCompendium = dynamic(() => import('./homebrew-compendium').then(m => m.HomebrewCompendium), { ssr: false });
const QuickImprovWidget = dynamic(() => import('./quick-improv-widget').then(m => m.QuickImprovWidget), { ssr: false });

type CampaignManagerProps = {
  campaigns: Campaign[];
  activeCampaign: CampaignWithRelations | null;
  initialView?: string;
  sessions: Session[];
  dbMagicItems: MagicItem[];
  dbMonsters: Monster[];
  dbSpells: Spell[];
  allArmor: Armor[];
  allWeapons: Weapon[];
  magicArmor: MagicItem[];
  magicWeapons: MagicItem[];
  skills: Skill[];
  possessedItems: string[];
  allItems: MagicItem[];
  letterPresets: LetterPreset[];
  shops: Shop[];
  worldLocations: WorldLocation[];
  npcs: Npc[];
  combats: Combat[];
};

const VIEW_METADATA: Record<string, { title: string, desc: string, icon: any }> = {
    'personaggi': { title: 'Personaggi Giocanti', desc: 'Gestisci gli eroi della tua storia.', icon: Users },
    'taverna': { title: 'Taverna', desc: "L'Oste serve risposte e sussurra segreti...", icon: Beer },
    'biblioteca': { title: 'Biblioteca delle Cronache', desc: 'Ogni volume racchiude un\'era di gesta.', icon: LibraryBig },
    'riepilogo-png': { title: 'Anagrafe dei PNG', desc: 'Directory centrale dei personaggi incontrati.', icon: UserCircle },
    'homebrew': { title: 'Compendio Homebrew', desc: 'Regole della tua ambientazione e logiche IA.', icon: Hammer },
    'manuale-importa': { title: 'Importazione Intelligente', desc: 'Estrai dati tecnici dai tuoi manuali.', icon: Library },
    'abilità': { title: 'Abilità', desc: 'Consulta il compendio delle capacità 5e.', icon: BrainCircuit },
    'equipaggiamento': { title: 'Equipaggiamento', desc: 'Armi e armature comuni e magiche.', icon: Shield },
    'oggetti': { title: 'Oggetti', desc: 'Database di oggetti meravigliosi e pozioni.', icon: Sparkles },
    'bestiario': { title: 'Bestiario', desc: 'Statistiche e illustrazioni delle creature.', icon: Skull },
    'magie': { title: 'Incantesimi', desc: 'Il grimorio arcano della campagna.', icon: Wand },
    'mappe': { title: 'Mappe', desc: 'Cartografia vettoriale generata dall\'IA.', icon: Map },
    'lettere': { title: 'Ordini e Lettere', desc: 'Crea pergamene e decreti realistici.', icon: Mail },
    'botteghe': { title: 'Botteghe ed Empori', desc: 'Mercanti unici e inventari speciali.', icon: Store },
    'architetto': { title: 'Architetto di Mondi', desc: 'Plasmare luoghi, atmosfere e segreti.', icon: MapPin },
    'anagrafe': { title: 'Emporio dei Volti', desc: 'Generare identità e psicologie profonde.', icon: UserCircle },
    'combattimenti': { title: 'Arena del Destino', desc: 'Configura scontri tattici bilanciati.', icon: Sword },
    'tesori': { title: 'Generatore di Tesori', desc: 'Crea bottini coerenti e memorabili.', icon: Sparkles },
    'layout-sperimentale': { title: 'Genera Carte Complete', icon: LayoutGrid, desc: 'Handout professionali per la stampa.' },
    'crea-carte': { title: 'Crea Carte', desc: 'Handout fisici per oggetti e magie.', icon: Hammer },
    'personalizza': { title: 'Personalizza Sfondi', desc: 'Gestisci le texture delle tue carte.', icon: Palette },
    'impostazioni': { title: 'Stato Sistema', desc: 'Verifica configurazione e chiavi API.', icon: Settings },
};

function ManagerContent(props: CampaignManagerProps) {
  const { campaigns, activeCampaign, sessions, dbMagicItems, dbMonsters, dbSpells, allArmor, allWeapons, magicArmor, magicWeapons, skills, possessedItems, allItems, letterPresets, shops, worldLocations, npcs, combats } = props;
  const [overlayView, setOverlayView] = useState<string | null>(null);
  const [isEditingCampaign, setIsEditingCampaign] = useState(false);
  const [tempName, setTempName] = useState(activeCampaign?.name || '');
  const [tempSetting, setTempSetting] = useState(activeCampaign?.setting || '');
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);
  const [pendingSession, setPendingSession] = useState<Session | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  const { toggleSidebar } = useSidebar();
  const { toast } = useToast();
  const router = useRouter();

  const handleUpdateCampaign = async () => {
      if (!activeCampaign) return;
      setIsSavingCampaign(true);
      try {
          const res = await actions.updateCampaignInfo(activeCampaign.id, tempName, tempSetting);
          if (res.success) {
              toast({ title: "Dati Campagna Aggiornati!" });
              setIsEditingCampaign(false);
              router.refresh();
          } else throw new Error(res.error || "Errore");
      } catch (e: any) {
          toast({ variant: 'destructive', title: "Errore", description: e.message });
      } finally {
          setIsSavingCampaign(false);
      }
  };

  const renderToolContent = (view: string) => {
    if (!activeCampaign) return null;
    switch (view) {
        case 'personaggi': return <PlayerCharactersDb campaignId={activeCampaign.id} initialCharacters={activeCampaign.playerCharacters} oldData={null} skills={skills} onSave={actions.savePlayerCharacter} onDelete={actions.deletePlayerCharacter} />;
        case 'biblioteca': return <ArchiveView campaignId={activeCampaign.id} />;
        case 'homebrew': return <HomebrewCompendium campaign={activeCampaign} />;
        case 'riepilogo-png': return <NpcSummary campaignId={activeCampaign.id} npcs={npcs} />;
        case 'abilità': return <SkillsDb skills={skills} campaignId={activeCampaign.id} onSave={actions.saveSkill} onDelete={actions.deleteSkill} possessedItems={possessedItems} onTogglePossession={actions.toggleItemPossession} />;
        case 'equipaggiamento': return <EquipmentDb campaignId={activeCampaign.id} armor={allArmor} weapons={allWeapons} magicArmor={magicArmor} magicWeapons={magicWeapons} onSaveItem={actions.saveMagicItem} onDeleteItem={actions.deleteMagicItem} possessedItems={possessedItems} onTogglePossession={actions.toggleItemPossession} />;
        case 'oggetti': return <ItemsDb magicItems={dbMagicItems} campaignId={activeCampaign.id} onSaveItem={actions.saveMagicItem} onDeleteItem={actions.deleteMagicItem} possessedItems={possessedItems} onTogglePossession={actions.toggleItemPossession} />;
        case 'bestiario': return <MonstersDb monsters={dbMonsters} campaignId={activeCampaign.id} onSave={actions.saveMonster} onDelete={actions.deleteMonster} possessedItems={possessedItems} onTogglePossession={actions.toggleItemPossession} />;
        case 'magie': return <SpellsDb spells={dbSpells} campaignId={activeCampaign.id} onSave={actions.saveSpell} onDelete={actions.deleteSpell} possessedItems={possessedItems} onTogglePossession={actions.toggleItemPossession} />;
        case 'mappe': return <MapGenerator />;
        case 'lettere': return <LetterGenerator presets={letterPresets} />;
        case 'botteghe': return <ShopManager campaign={activeCampaign} dbItems={allItems} savedShops={shops} />;
        case 'architetto': return <WorldArchitect campaign={activeCampaign} savedLocations={worldLocations} />;
        case 'anagrafe': return <NpcGenerator campaign={activeCampaign} savedNpcs={npcs} />;
        case 'combattimenti': return <CombatGenerator campaign={activeCampaign} savedCombats={combats} />;
        case 'tesori': return <TreasureGenerator campaign={activeCampaign} />;
        case 'manuale-importa': return <CatalogHandbook campaignId={activeCampaign.id} />;
        case 'layout-sperimentale': return <ExperimentalCardGenerator allItems={allItems} dbSpells={dbSpells} />;
        case 'crea-carte': return <UnifiedCardGenerator allItems={allItems} dbSpells={dbSpells} />;
        case 'personalizza': return <CardBackgroundUploader />;
        case 'impostazioni': return <SettingsView campaignId={activeCampaign.id} />;
        case 'taverna': return <QuickImprovWidget campaignId={activeCampaign.id} inline />;
        default: return null;
    }
  };

  return (
    <>
        <SidebarNav 
          activeView="storia" 
          onViewChange={(v) => setOverlayView(v)} 
          onNewCampaign={() => window.location.href = '/?view=nuova'} 
          onBackup={async () => { 
            const res = await actions.getBackupData(); 
            if (res.success && res.data) { 
                const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" }); 
                const url = URL.createObjectURL(blob); 
                const a = document.createElement('a'); 
                a.href = url; 
                const now = new Date();
                const dateStr = now.toISOString().slice(0, 10);
                const timeStr = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0');
                a.download = `backup-${dateStr}_${timeStr}.json`; 
                a.click(); 
            } 
          }} 
        />
        
        <SidebarInset className="overflow-x-hidden min-h-screen">
            <main className="w-full px-4 py-6 sm:px-6 lg:px-8">
                <header className="flex flex-col items-center justify-center text-center gap-2 border-b pb-6 mb-8 relative group w-full">
                    <div className="md:hidden absolute left-0 -top-2">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => toggleSidebar()}
                            className="h-10 w-10 text-primary"
                        >
                            <Icons.logo className="h-6 w-6" />
                        </Button>
                    </div>

                    <div className="flex flex-col items-center gap-1 w-full max-w-4xl px-10">
                        <div className="relative flex items-center justify-center w-full">
                            <h1 className="font-headline text-3xl md:text-5xl font-bold text-primary leading-tight text-center px-2">
                                {activeCampaign?.name}
                            </h1>
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 shrink-0" onClick={() => setIsEditingCampaign(true)}>
                                    <Pencil className="h-4 w-4 sm:h-5 sm:w-5" />
                                </Button>
                                {campaigns.length > 1 && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
                                                <ChevronsUpDown className="h-4 w-4 sm:h-5 sm:w-5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Cambia Campagna</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {campaigns.map((c) => (
                                                <DropdownMenuItem key={c.id} onSelect={() => router.push(`/?campaignId=${c.id}&view=storia`)}>
                                                    {c.name}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        </div>
                        <p className="text-[10px] md:text-base text-muted-foreground tracking-[0.2em] uppercase font-light italic mt-2">
                            {activeCampaign?.setting}
                        </p>
                    </div>
                </header>
                
                <Dialog open={isEditingCampaign} onOpenChange={setIsEditingCampaign}>
                    <DialogContent className="sm:max-w-[425px] w-[95vw]">
                        <DialogHeader>
                            <DialogTitle>Modifica Campagna</DialogTitle>
                            <DialogDescription>Aggiorna le informazioni di base della tua cronaca.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Nome Campagna</Label>
                                <Input value={tempName} onChange={(e) => setTempName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Ambientazione</Label>
                                <Input value={tempSetting} onChange={(e) => setTempSetting(e.target.value)} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsEditingCampaign(false)}>Annulla</Button>
                            <Button onClick={handleUpdateCampaign} disabled={isSavingCampaign}>
                                {isSavingCampaign ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Check className="mr-2 h-4 w-4"/>}
                                Salva
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Sheet open={!!overlayView} onOpenChange={(o) => !o && setOverlayView(null)}>
                    <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto p-4 sm:p-8">
                        <SheetHeader className="mb-6 flex flex-col items-center justify-center text-center">
                            <SheetTitle className="text-2xl font-headline flex items-center justify-center gap-2 w-full text-center">
                                {overlayView && VIEW_METADATA[overlayView]?.icon && 
                                    (() => {
                                        const Icon = VIEW_METADATA[overlayView].icon;
                                        return <Icon className="h-6 w-6 text-primary" />;
                                    })()
                                } 
                                {overlayView ? VIEW_METADATA[overlayView]?.title : 'Strumento'}
                            </SheetTitle>
                            <SheetDescription className="text-center italic">
                                {overlayView ? VIEW_METADATA[overlayView]?.desc : 'Consulta i dati della campagna.'}
                            </SheetDescription>
                        </SheetHeader>
                        <div className="space-y-8">
                            {overlayView && renderToolContent(overlayView)}
                        </div>
                    </SheetContent>
                </Sheet>

                <div className="space-y-12 w-full">
                    {activeCampaign && (
                        <CampaignDashboard 
                            campaign={activeCampaign} 
                            sessions={sessions} 
                            onGenerate={async (p, m) => { setIsGenerating(true); const r = await actions.generateNextSession(activeCampaign, sessions, p, m); if (r.success && r.data) { setPendingSession({ session_number: sessions.length + 1, title: `Scena ${sessions.length + 1}`, notes: r.data.sessionOutline, source: 'generated', xp_award: r.data.xpAward, id: `${Date.now()}`, campaignId: activeCampaign.id, arcId: activeCampaign.activeArc?.id || '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), is_read: false, loot_scanned: false, is_archived: false }); } else toast({ variant: 'destructive', title: 'Errore', description: r.error }); setIsGenerating(false); }} 
                            onConfirmSession={async (s) => { const r = await actions.confirmSession(s, activeCampaign.id); if (r.success) { setPendingSession(null); router.refresh(); } else toast({ variant: 'destructive', title: 'Errore', description: r.error }); }} 
                            onImportSession={async (n, t) => { const r = await actions.importSession(n, t, activeCampaign.id, sessions.length + 1); if (r.success) router.refresh(); else toast({ variant: 'destructive', title: 'Errore', description: r.error }); }} 
                            pendingSession={pendingSession} 
                            isGenerating={isGenerating} 
                            onPendingSessionChange={(u) => setPendingSession(prev => { if (!prev) { return { id: `draft-${Date.now()}`, session_number: sessions.length + 1, title: u.title || `Scena ${sessions.length + 1}`, notes: u.notes || '', xp_award: u.xp_award || 0, source: 'generated', campaignId: activeCampaign.id, arcId: activeCampaign.activeArc?.id || '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), is_read: false, loot_scanned: false, is_archived: false } as Session; } return { ...prev, ...u }; })} 
                            onSummarizeCampaign={async () => { setIsSummarizing(true); const r = await actions.summarizeCampaign(activeCampaign.id); if (r.success) router.refresh(); setIsSummarizing(false); }} 
                            isSummarizing={isSummarizing} 
                            onUpdateSessionTitle={actions.updateSessionTitle} 
                            onUpdateSessionNumber={actions.updateSessionNumber} 
                            onUpdateSessionNotes={actions.updateSessionNotes} 
                            onDeleteSession={actions.deleteSession} 
                            onReorderSessions={actions.reorderSessions} 
                            onUpdateSessionXp={actions.updateSessionXp} 
                            onToggleSessionRead={actions.toggleSessionReadStatus} 
                            onClearSessionLoot={actions.clearSessionLoot} 
                            onFocusSession={(id) => { const s = sessions.find(x => x.id === id); if (s) router.push(`/?campaignId=${activeCampaign.id}&view=storia&focus=${id}`); }}
                        />
                    )}
                </div>
            </main>
        </SidebarInset>
    </>
  );
}

export function CampaignManager({
  campaigns, activeCampaign, initialView, sessions, dbMagicItems, dbMonsters, dbSpells, allArmor, allWeapons, magicArmor, magicWeapons, skills, possessedItems, allItems, letterPresets, shops, worldLocations, npcs, combats,
}: CampaignManagerProps) {
  const [isCreating, setIsCreating] = useState<boolean>(!activeCampaign || initialView === 'nuova');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!activeCampaign && campaigns.length > 0 && !isCreating) {
      window.location.href = `/?campaignId=${campaigns[0].id}&view=storia`;
    }
  }, [activeCampaign, campaigns, isCreating]);

  const handleCreateCampaign = async (data: any) => {
    setLoading(true);
    try {
      const result = await actions.createCampaign(data);
      if (result.success && result.data?.campaign) {
        toast({ title: "Campagna Creata!", description: result.data.progress });
        setIsCreating(false);
        window.location.href = `/?campaignId=${result.data.campaign.id}&view=storia`;
      } else {
        throw new Error(result.error || "Errore nella creazione della campagna.");
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <SidebarProvider>
      <input id="restore-backup-input" type="file" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = async (ev) => { setLoading(true); const res = await actions.restoreBackupData(ev.target?.result as string); if (res.success) window.location.href = '/'; else toast({ variant: 'destructive', title: 'Errore', description: r.error }); setLoading(false); }; r.readAsText(f); }} className="hidden" accept=".json" />
      {isCreating ? (
        <CampaignInitializer onCreateCampaign={handleCreateCampaign} onCancel={activeCampaign ? () => setIsCreating(false) : undefined} />
      ) : activeCampaign ? (
        <ManagerContent 
            campaigns={campaigns}
            activeCampaign={activeCampaign}
            sessions={sessions}
            dbMagicItems={dbMagicItems}
            dbMonsters={dbMonsters}
            dbSpells={dbSpells}
            allArmor={allArmor}
            allWeapons={allWeapons}
            magicArmor={magicArmor}
            magicWeapons={magicWeapons}
            skills={skills}
            possessedItems={possessedItems}
            allItems={allItems}
            letterPresets={letterPresets}
            shops={shops}
            worldLocations={worldLocations}
            npcs={npcs}
            combats={combats}
        />
      ) : null}
    </SidebarProvider>
  );
}
