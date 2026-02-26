
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Campaign, CampaignWithRelations, Session, MagicItem, Monster, Spell, Skill, PlayerCharacter, Weapon, Armor } from '@/lib/types';
import { CampaignInitializer } from '@/components/campaign-initializer';
import { CampaignDashboard } from '@/components/campaign-dashboard';
import { EquipmentDb } from './equipment-db';
import { ItemsDb } from './items-db';
import { MonstersDb } from './monsters-db';
import { SpellsDb } from './spells-db';
import { SkillsDb } from './skills-db';
import { PlayerCharactersDb } from './player-characters-db';
import { MapGenerator } from './map-generator';
import { ContentImporter } from './content-importer';
import { UnifiedCardGenerator } from './unified-card-generator';
import { ExperimentalCardGenerator } from './experimental-card-generator';
import { CardBackgroundUploader } from './card-background-uploader';
import * as actions from '@/lib/actions';
import { useToast } from "@/hooks/use-toast";
import { Icons } from '@/components/icons';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarProvider, SidebarInset, SidebarRail, SidebarTrigger } from '@/components/ui/sidebar';
import { SidebarNav } from './sidebar-nav';

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
};

export function CampaignManager({
  campaigns,
  activeCampaign,
  initialView,
  sessions,
  dbMagicItems,
  dbMonsters,
  dbSpells,
  allArmor,
  allWeapons,
  magicArmor,
  magicWeapons,
  skills,
  possessedItems,
  allItems,
}: CampaignManagerProps) {
  
  const [isCreating, setIsCreating] = useState<boolean>(!activeCampaign);
  
  const [pendingSession, setPendingSession] = useState<Session | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState(initialView || 'storia');
  
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!activeCampaign && campaigns.length > 0) {
      router.push(`/?campaignId=${campaigns[0].id}&view=storia`);
    }
    if (activeCampaign) {
      setIsCreating(false);
    }
  }, [activeCampaign, campaigns, router]);

  const allCardItems = useMemo(() => {
    const combined = [
        ...allArmor.map(i => ({...i, source: 'base' as const})), 
        ...allWeapons.map(i => ({...i, source: 'base' as const})), 
        ...allItems
    ];
    const uniqueMap = new Map<string, any>();
    combined.forEach(item => {
        if(!uniqueMap.has(item.name.toLowerCase())) {
            uniqueMap.set(item.name.toLowerCase(), item);
        }
    });
    return Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allArmor, allWeapons, allItems]);

  const handleCreateCampaign = async (data: { name: string; setting: string; description?: string | null; }) => {
    setLoading(true);
    try {
      const result = await actions.createCampaign(data);
      if (result.success && result.campaign) {
        toast({
          title: "Campagna Creata!",
          description: result.progress,
        });
        setIsCreating(false);
        router.push(`/?campaignId=${result.campaign.id}&view=storia`);
      } else {
        throw new Error(result.error || "Impossibile creare la campagna.");
      }
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message || "Impossibile inizializzare la campagna. Per favore riprova.",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleGenerateSession = async (prompt: string, modification?: { storyToModify: string, request: string }) => {
    if (!activeCampaign) return;
    setIsGenerating(true);
    if (!modification) {
      setPendingSession(null);
    }
    try {
      const result = await actions.generateNextSession(activeCampaign, sessions, prompt, modification);

      if (!result.success || !result.data) {
          throw new Error(result.error || "Impossibile generare la scena.");
      }
      
      const newSessionData: Omit<Session, 'id' | 'campaignId' | 'createdAt' | 'updatedAt' | 'is_read'> = {
        session_number: sessions.length + 1,
        title: `Scena ${sessions.length + 1}`,
        notes: result.data.sessionOutline,
        source: 'generated' as const,
        xp_award: result.data.xpAward,
      };

      setPendingSession({ ...newSessionData, id: `${Date.now()}`, campaignId: activeCampaign.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), is_read: false });

    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Errore di Generazione IA",
        description: error.message,
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleConfirmSession = async (sessionToConfirm: Session) => {
    if (!activeCampaign) return;
    
    setLoading(true);
    try {
        const { id, campaignId, createdAt, updatedAt, is_read, ...sessionData } = sessionToConfirm;
        const result = await actions.confirmSession(sessionData, activeCampaign.id);
        if (result.success) {
            toast({
              title: "Scena Aggiunta!",
              description: `La scena "${sessionToConfirm.title}" è stata aggiunta alla cronologia.`,
            });
            setPendingSession(null);
            router.refresh();
        } else {
            throw new Error(result.error || "Impossibile confermare la sessione.");
        }
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message,
      });
    } finally {
        setLoading(false);
    }
  }
  
  const handlePendingSessionChange = (updates: Partial<Pick<Session, 'title' | 'notes' | 'xp_award'>>) => {
    setPendingSession(prev => {
      if (!prev) return null;
      return { ...prev, ...updates };
    });
  };

  const handleImportSession = async (notes: string, title: string) => {
    if (!activeCampaign) return;
    setLoading(true);
    try {
        const result = await actions.importSession(notes, title, activeCampaign.id, sessions.length + 1);
        if (result.success) {
            toast({
                title: "Sessione Importata!",
                description: `La sessione è stata aggiunta alla tua campagna.`,
            });
            router.refresh();
        } else {
            throw new Error(result.error || "Impossibile importare la sessione.");
        }
    } catch(error: any) {
        toast({ variant: "destructive", title: "Errore", description: error.message });
    } finally {
        setLoading(false);
    }
  };
  
  const handleUpdateSessionTitle = async (sessionId: string, title: string) => {
    const result = await actions.updateSessionTitle(sessionId, title);
    if (result.success) {
      toast({ title: 'Titolo Aggiornato!' });
      router.refresh();
    } else {
      toast({ variant: "destructive", title: "Errore", description: result.error || "Impossibile aggiornare il titolo." });
    }
  };

  const handleUpdateSessionNotes = async (sessionId: string, notes: string) => {
    const result = await actions.updateSessionNotes(sessionId, notes);
    if (result.success) {
      toast({ title: "Contenuto Aggiornato!" });
      router.refresh();
    } else {
      toast({ variant: "destructive", title: "Errore", description: result.error || "Impossibile aggiornare le note." });
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    const result = await actions.deleteSession(sessionId);
    if (result.success) {
      toast({ title: "Sessione Eliminata" });
      router.refresh();
    } else {
      toast({ variant: "destructive", title: "Errore", description: result.error || "Impossibile eliminare la sessione." });
    }
  };

  const handleReorderSessions = async (orderedIds: string[]) => {
    if (!activeCampaign) return;
    const result = await actions.reorderSessions(orderedIds, activeCampaign.id);
    if (result.success) {
      toast({ title: "Ordine delle sessioni aggiornato!" });
      router.refresh();
    } else {
      toast({ variant: "destructive", title: "Errore", description: result.error || "Impossibile riordinare le sessioni." });
    }
  };

  const handleSummarizeCampaign = async () => {
    if (!activeCampaign) return;
    setIsSummarizing(true);
    try {
        const result = await actions.summarizeCampaign(activeCampaign.id);
        if (result.success) {
            toast({
                title: "Sommario Aggiornato!",
                description: "L'IA ha creato un nuovo riassunto della campagna.",
            });
            router.refresh();
        } else {
            throw new Error(result.error || "Impossibile creare il sommario.");
        }
    } catch(error: any) {
        toast({ variant: "destructive", title: "Errore", description: error.message });
    } finally {
        setIsSummarizing(false);
    }
  };

  const handleUpdateSessionXp = async (sessionId: string, xp: number) => {
    const result = await actions.updateSessionXp(sessionId, xp);
    if (result.success) {
      toast({ title: 'XP Aggiornati!' });
      router.refresh();
    } else {
      toast({ variant: 'destructive', title: 'Errore', description: result.error || 'Impossibile aggiornare i punti esperienza.' });
    }
  };

  const handleToggleSessionRead = async (sessionId: string) => {
    const result = await actions.toggleSessionReadStatus(sessionId);
    if (result.success) {
      router.refresh();
    } else {
      toast({ variant: 'destructive', title: 'Errore', description: result.error || 'Impossibile aggiornare lo stato della sessione.' });
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const result = await actions.getBackupData();
      if (!result.success || !result.data) {
        throw new Error(result.error || "Dati non trovati.");
      }
      const dataStr = JSON.stringify(result.data, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tessitore-di-cronache-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Backup Scaricato",
        description: "Il backup della tua campagna è stato salvato.",
      });
    } catch (error: any) {
      console.error("Failed to download backup", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message || "Impossibile creare il file di backup.",
      });
    }
  };
  
  const handleRestoreBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error("File could not be read");
        
        setLoading(true);
        const result = await actions.restoreBackupData(text);

        if (result.success) {
            toast({
              title: "Backup Ripristinato!",
              description: "I dati della tua campagna sono stati caricati con successo.",
            });
            router.refresh();
        } else {
            throw new Error(result.error || "File di backup non valido o corrotto.");
        }

      } catch (error: any) {
        console.error("Errore durante il ripristino:", error);
        toast({
          variant: "destructive",
          title: "Errore di Ripristino",
          description: error.message,
        });
      } finally {
        event.target.value = "";
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleSwitchCampaign = (campaignId: string) => {
    router.push(`/?campaignId=${campaignId}&view=${activeView}`);
  };

  const handleViewChange = (view: string) => {
    setActiveView(view);
    const params = new URLSearchParams(window.location.search);
    params.set('view', view);
    router.push(`?${params.toString()}`, { scroll: false });
  };

    const handleSaveMagicItem = async (itemData: Partial<MagicItem> & { campaignId: string }) => {
        const result = await actions.saveMagicItem(itemData);
        if (result.success) {
            toast({ title: "Oggetto Salvato!", description: "I dati dell'oggetto sono stati aggiornati." });
            router.refresh();
        } else {
            toast({ variant: "destructive", title: "Errore", description: result.error || "Impossibile salvare l'oggetto." });
        }
    };
    const handleDeleteMagicItem = async (itemId: string) => {
        const result = await actions.deleteMagicItem(itemId);
        if (result.success) {
            toast({ title: "Oggetto Eliminato" });
            router.refresh();
        } else {
            toast({ variant: "destructive", title: "Errore", description: result.error || "Impossibile eliminare l'oggetto." });
        }
    };
    const handleSaveMonster = async (monsterData: Partial<Monster> & { campaignId: string }) => {
        const result = await actions.saveMonster(monsterData);
        if (result.success) {
            toast({ title: "Mostro Salvato!", description: "I dati del mostro sono stati aggiornati." });
            router.refresh();
        } else {
            toast({ variant: "destructive", title: "Errore", description: result.error || "Impossibile salvare il mostro." });
        }
    };
    const handleDeleteMonster = async (monsterId: string) => {
        const result = await actions.deleteMonster(monsterId);
        if (result.success) {
            toast({ title: "Mostro Eliminato" });
            router.refresh();
        } else {
            toast({ variant: "destructive", title: "Errore", description: result.error || "Impossibile eliminare il mostro." });
        }
    };
    const handleSaveSpell = async (spellData: Partial<Spell> & { campaignId: string }) => {
        const result = await actions.saveSpell(spellData);
        if (result.success) {
            toast({ title: "Incantesimo Salvato!", description: "I dati dell'incantesimo sono stati aggiornati." });
            router.refresh();
        } else {
            toast({ variant: "destructive", title: "Errore", description: result.error || "Impossibile salvare l'incantesimo." });
        }
    };
    const handleDeleteSpell = async (spellId: string) => {
        const result = await actions.deleteSpell(spellId);
        if (result.success) {
            toast({ title: "Incantesimo Eliminato" });
            router.refresh();
        } else {
            toast({ variant: "destructive", title: "Errore", description: result.error || "Impossibile eliminare l'incantesimo." });
        }
    };
    const handleSaveSkill = async (skillData: Partial<Skill> & { campaignId: string }) => {
        const result = await actions.saveSkill(skillData);
        if (result.success) {
            toast({ title: "Abilità Salvata!", description: "I dati dell'abilità sono stati aggiornati." });
            router.refresh();
        } else {
            toast({ variant: "destructive", title: "Errore", description: result.error || "Impossibile salvare l'abilità." });
        }
    };
    const handleDeleteSkill = async (skillId: string) => {
        const result = await actions.deleteSkill(skillId);
        if (result.success) {
            toast({ title: "Abilità Eliminata" });
            router.refresh();
        } else {
            toast({ variant: "destructive", title: "Errore", description: result.error || "Impossibile eliminare l'abilità." });
        }
    };
    const handleSavePlayerCharacter = async (characterData: Omit<PlayerCharacter, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
        const result = await actions.savePlayerCharacter(characterData);
        if (result.success) {
            toast({ title: "Personaggio Salvato!" });
            router.refresh();
        } else {
            toast({ variant: "destructive", title: "Errore", description: result.error || "Impossibile salvare il personaggio." });
        }
    };
    const handleDeletePlayerCharacter = async (characterId: string) => {
        const result = await actions.deletePlayerCharacter(characterId);
        if (result.success) {
            toast({ title: "Personaggio Eliminato" });
            router.refresh();
        } else {
            toast({ variant: "destructive", title: "Errore", description: result.error || "Impossibile eliminare il personaggio." });
        }
    };
    const handleTogglePossession = async (itemName: string) => {
        if (!activeCampaign) return;
        const result = await actions.toggleItemPossession(activeCampaign.id, itemName);
        if (result.success) {
          router.refresh();
        } else {
          toast({ variant: 'destructive', title: 'Errore', description: result.error || 'Impossibile aggiornare lo stato.' });
        }
      };


  const renderActiveView = () => {
    if (!activeCampaign) return null;
    switch (activeView) {
        case 'storia':
            return <CampaignDashboard 
                        campaign={activeCampaign} 
                        sessions={sessions}
                        onGenerate={handleGenerateSession}
                        onConfirmSession={handleConfirmSession}
                        onImportSession={handleImportSession}
                        pendingSession={pendingSession}
                        isGenerating={isGenerating}
                        onPendingSessionChange={handlePendingSessionChange}
                        onSummarizeCampaign={handleSummarizeCampaign}
                        isSummarizing={isSummarizing}
                        onUpdateSessionTitle={handleUpdateSessionTitle}
                        onUpdateSessionNotes={handleUpdateSessionNotes}
                        onDeleteSession={handleDeleteSession}
                        onReorderSessions={handleReorderSessions}
                        onUpdateSessionXp={handleUpdateSessionXp}
                        onToggleSessionRead={handleToggleSessionRead}
                    />;
        case 'personaggi':
            return <PlayerCharactersDb
                        campaignId={activeCampaign.id}
                        initialCharacters={activeCampaign.playerCharacters ?? []}
                        oldData={activeCampaign.player_characters}
                        skills={skills}
                        onSave={handleSavePlayerCharacter}
                        onDelete={handleDeletePlayerCharacter}
                    />;
        case 'abilità':
            return <SkillsDb 
                        skills={skills} 
                        campaignId={activeCampaign.id}
                        onSave={handleSaveSkill}
                        onDelete={handleDeleteSkill}
                        possessedItems={possessedItems}
                        onTogglePossession={handleTogglePossession}
                    />;
        case 'equipaggiamento':
            return <EquipmentDb 
                        campaignId={activeCampaign.id}
                        armor={allArmor} 
                        weapons={allWeapons} 
                        magicArmor={magicArmor}
                        magicWeapons={magicWeapons}
                        onSaveItem={handleSaveMagicItem}
                        onDeleteItem={handleDeleteMagicItem}
                        possessedItems={possessedItems}
                        onTogglePossession={handleTogglePossession}
                    />;
        case 'oggetti':
            return <ItemsDb 
                        magicItems={dbMagicItems} 
                        campaignId={activeCampaign.id}
                        onSaveItem={handleSaveMagicItem}
                        onDeleteItem={handleDeleteMagicItem}
                        possessedItems={possessedItems}
                        onTogglePossession={handleTogglePossession}
                     />;
        case 'bestiario':
            return <MonstersDb 
                        monsters={dbMonsters} 
                        campaignId={activeCampaign.id}
                        onSave={handleSaveMonster}
                        onDelete={handleDeleteMonster}
                        possessedItems={possessedItems}
                        onTogglePossession={handleTogglePossession}
                    />;
        case 'magie':
            return <SpellsDb 
                        spells={dbSpells} 
                        campaignId={activeCampaign.id} 
                        onSave={handleSaveSpell}
                        onDelete={handleDeleteSpell}
                        possessedItems={possessedItems}
                        onTogglePossession={handleTogglePossession}
                    />;
        case 'mappe':
            return <MapGenerator />;
        case 'importa':
            return <ContentImporter campaignId={activeCampaign.id} />;
        case 'crea-carte':
             return <UnifiedCardGenerator allItems={allCardItems} dbSpells={dbSpells} />;
        case 'layout-sperimentale':
             return <ExperimentalCardGenerator allItems={allCardItems} dbSpells={dbSpells} />;
        case 'personalizza':
            return <CardBackgroundUploader />;
        default:
            return <div>Seleziona una vista</div>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Icons.logo className="h-20 w-20 text-primary animate-spin" />
      </div>
    );
  }
  
  return (
    <>
      <input id="restore-backup-input" type="file" onChange={handleRestoreBackup} className="hidden" accept=".json" />
      
      {isCreating || !activeCampaign ? (
        <CampaignInitializer 
            onCreateCampaign={handleCreateCampaign} 
        />
      ) : (
        <SidebarProvider>
          <SidebarNav
            activeView={activeView}
            onViewChange={handleViewChange}
            onNewCampaign={() => setIsCreating(true)}
            onBackup={handleDownloadBackup}
          />
          <div className="flex flex-col w-full">
            <SidebarRail />
            <SidebarInset>
                <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                    <header className="grid md:flex grid-cols-[auto_1fr_auto] items-center md:justify-between gap-4 border-b pb-6 mb-6">
                        <div className="flex justify-start">
                            <SidebarTrigger className="md:hidden flex-shrink-0" />
                        </div>
                        <div className="text-center md:text-left">
                            <div className="flex items-center justify-center md:justify-start">
                                <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary break-words">{activeCampaign.name}</h1>
                                {campaigns.length > 1 && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                                <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuLabel>Seleziona Campagna</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {campaigns.map((c) => (
                                                <DropdownMenuItem key={c.id} onSelect={() => handleSwitchCampaign(c.id)} disabled={c.id === activeCampaign.id}>
                                                    {c.name}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                            <p className="text-lg text-muted-foreground -mt-2">{activeCampaign.setting}</p>
                        </div>
                        <div className="flex justify-end" />
                    </header>

                    <div className="space-y-8">
                      {renderActiveView()}
                    </div>
                </main>
            </SidebarInset>
          </div>
        </SidebarProvider>
      )}
    </>
  );
}
