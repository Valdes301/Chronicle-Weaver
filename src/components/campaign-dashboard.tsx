
'use client';

import { useState, useEffect } from 'react';
import type { CampaignWithRelations, Session } from '@/lib/types';
import { SessionTimeline } from './session-timeline';
import { WorldDb } from './world-db';
import { GenerationPanel } from './generate-session-dialog';
import { Button } from './ui/button';
import { BookMarked, Loader2, Sparkles, Pencil, Check, X, Archive } from 'lucide-react';
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle, 
    AlertDialogTrigger 
} from "./ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import * as actions from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

type CampaignDashboardProps = {
  campaign: CampaignWithRelations;
  sessions: Session[];
  onGenerate: (prompt: string, modification?: { storyToModify: string, request: string }) => Promise<void>;
  onConfirmSession: (session: Session) => void;
  onImportSession: (notes: string, title: string) => void;
  pendingSession: Session | null;
  isGenerating: boolean;
  onPendingSessionChange: (updates: Partial<Pick<Session, 'title' | 'notes' | 'xp_award'>>) => void;
  onSummarizeCampaign: () => Promise<void>;
  isSummarizing: boolean;
  onUpdateSessionTitle: (sessionId: string, title: string) => Promise<void>;
  onUpdateSessionNumber: (sessionId: string, num: number) => Promise<void>;
  onUpdateSessionNotes: (sessionId: string, notes: string) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onReorderSessions: (orderedIds: string[]) => Promise<void>;
  onUpdateSessionXp: (sessionId: string, xp: number) => Promise<void>;
  onToggleSessionRead: (sessionId: string) => Promise<void>;
  onClearSessionLoot: (sessionId: string) => Promise<void>;
};

export function CampaignDashboard({
  campaign,
  sessions,
  onGenerate,
  onConfirmSession,
  onImportSession,
  pendingSession,
  isGenerating,
  onPendingSessionChange,
  onSummarizeCampaign,
  isSummarizing,
  onUpdateSessionTitle,
  onUpdateSessionNumber,
  onUpdateSessionNotes,
  onDeleteSession,
  onReorderSessions,
  onUpdateSessionXp,
  onToggleSessionRead,
  onClearSessionLoot,
}: CampaignDashboardProps) {
  const [isArchiving, setIsArchiving] = useState(false);
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [tempLabel, setTempLabel] = useState(campaign.active_arc_label || 'Arco Narrativo Attivo');
  const [tempTitle, setTempTitle] = useState(campaign.activeArc?.title || 'Atto Iniziale');
  const [isSavingHeader, setIsSavingHeader] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleArchive = async () => {
    if (!campaign.activeArc) return;
    setIsArchiving(true);
    try {
        const res = await actions.archiveActiveArc(campaign.id, campaign.activeArc.id);
        if (res.success) {
            toast({
                title: "Arco Narrativo Archiviato!",
                description: `Le sessioni sono state spostate nella Biblioteca delle Cronache.`,
            });
            router.refresh();
        } else throw new Error(res.error);
    } catch (e: any) {
        toast({ variant: 'destructive', title: "Errore", description: e.message });
    } finally {
        setIsArchiving(false);
    }
  };

  const handleSaveHeader = async () => {
    if (!campaign.activeArc) return;
    setIsSavingHeader(true);
    try {
        const res = await actions.updateActiveArcInfo(campaign.id, campaign.activeArc.id, tempTitle, tempLabel);
        if (res.success) {
            toast({ title: "Intestazione Aggiornata!" });
            setIsEditingHeader(false);
            router.refresh();
        } else throw new Error(res.error);
    } catch (e: any) {
        toast({ variant: 'destructive', title: "Errore", description: e.message });
    } finally {
        setIsSavingHeader(false);
    }
  };

  if (!mounted) return null;
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b pb-4 group">
          <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <BookMarked className="h-5 w-5 text-accent" />
              </div>
              <div className="relative">
                  <div className="flex items-center gap-2">
                    <h2 className="font-headline text-2xl leading-none">{campaign.active_arc_label || 'Arco Narrativo Attivo'}</h2>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setIsEditingHeader(true)}>
                        <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mt-1">{campaign.activeArc?.title || 'Atto Iniziale'}</p>
              </div>
          </div>
      </div>

      <Dialog open={isEditingHeader} onOpenChange={setIsEditingHeader}>
          <DialogContent className="w-[95vw] max-w-md">
              <DialogHeader>
                  <DialogTitle>Personalizza Intestazione</DialogTitle>
                  <DialogDescription>Modifica le scritte che appaiono nel box dell'arco narrativo attivo.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                  <div className="space-y-2">
                      <Label>Testo Superiore (Etichetta)</Label>
                      <Input value={tempLabel} onChange={(e) => setTempLabel(e.target.value)} placeholder="es. Arco Narrativo Attivo" />
                  </div>
                  <div className="space-y-2">
                      <Label>Nome dell'Atto / Capitolo</Label>
                      <Input value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} placeholder="es. Atto Iniziale" />
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsEditingHeader(false)}>Annulla</Button>
                  <Button onClick={handleSaveHeader} disabled={isSavingHeader}>
                      {isSavingHeader ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Check className="h-4 w-4 mr-2"/>}
                      Salva Modifiche
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <GenerationPanel 
        onGenerate={onGenerate}
        onConfirm={onConfirmSession}
        pendingSession={pendingSession}
        isGenerating={isGenerating}
        onPendingSessionChange={onPendingSessionChange}
      />

      <SessionTimeline 
        sessions={sessions} 
        onImportSession={onImportSession}
        onUpdateSessionTitle={onUpdateSessionTitle}
        onUpdateSessionNumber={onUpdateSessionNumber}
        onUpdateSessionXp={onUpdateSessionXp}
        onUpdateSessionNotes={onUpdateSessionNotes}
        onDeleteSession={onDeleteSession}
        onReorderSessions={onReorderSessions}
        onToggleSessionRead={onToggleSessionRead}
        onClearSessionLoot={onClearSessionLoot}
      />

      <Card className="border-accent/20 bg-accent/5 overflow-hidden shadow-sm">
          <CardHeader className="pb-4">
              <CardTitle className="text-xl font-headline flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" /> Conclui Capitolo Attuale
              </CardTitle>
              <CardDescription>
                  Sposta tutte le sessioni attuali nella Biblioteca delle Cronache. Potrai generare la sintesi leggendaria successivamente, selezionando le storie poche alla volta per una cronaca più dettagliata.
              </CardDescription>
          </CardHeader>
          <CardFooter className="bg-accent/5 border-t border-accent/10 py-4">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="default" className="w-full gap-2 shadow-lg shadow-accent/20 h-11" disabled={sessions.length === 0 || isArchiving}>
                        {isArchiving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Archive className="h-4 w-4" />}
                        Archivia Volume e Inizia Nuovo Capitolo
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="w-[95vw] max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Concludere questo capitolo?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Le {sessions.length} sessioni attuali verranno spostate nella Biblioteca delle Cronache. La Dashboard tornerà pulita per il prossimo arco narrativo. Potrai generare la sintesi del volume con calma dalla Biblioteca.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction onClick={handleArchive}>Procedi all'Archiviazione</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
      </Card>

      <WorldDb
        campaign={campaign}
        onSummarize={onSummarizeCampaign}
        isSummarizing={isSummarizing}
      />
    </div>
  );
}
