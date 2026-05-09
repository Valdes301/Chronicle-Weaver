'use client';

import { useState, useMemo, useEffect, useId } from 'react';
import type { Npc, NpcDetails } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, History, UserCircle, BookUser, Loader2, MessageSquare, User, Pencil, Trash2, Check, X, Settings, ShieldAlert, Brain, UserPlus } from 'lucide-react';
import { Separator } from './ui/separator';
import { useToast } from '@/hooks/use-toast';
import * as actions from '@/lib/actions';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Textarea } from './ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NpcWithLastEvent = Npc & {
    details: NpcDetails;
    lastEvent: any | null;
};

type NpcSummaryProps = {
  campaignId: string;
  npcs: Npc[];
};

const npcEditSchema = z.object({
  name: z.string().min(1, "Il nome è obbligatorio."),
  race: z.string().min(1, "La razza è obbligatoria."),
  gender: z.string(),
  age: z.string(),
  status: z.string(),
  alignment: z.string(),
  occupation: z.string(),
  appearance: z.string(),
  personality: z.string(),
  mannerism: z.string(),
  secret: z.string(),
  encounterHook: z.string(),
});

type NpcEditFormData = z.infer<typeof npcEditSchema>;

/**
 * Componente per la creazione o modifica completa della scheda di un PNG.
 */
function NpcEditDialog({ npc, campaignId, open, onOpenChange, onSaved }: { npc: NpcWithLastEvent | null, campaignId: string, open: boolean, onOpenChange: (open: boolean) => void, onSaved: () => void }) {
    const formId = useId();
    const { toast } = useToast();

    const form = useForm<NpcEditFormData>({
        resolver: zodResolver(npcEditSchema),
        defaultValues: {
            name: '', race: '', gender: 'Maschio', age: 'Adulto', status: 'Normale', alignment: 'Neutrale',
            occupation: '', appearance: '', personality: '', mannerism: '', secret: '', encounterHook: '',
        },
    });

    useEffect(() => {
        if (open) {
            if (npc) {
                form.reset({
                    name: npc.name || '',
                    race: npc.race || '',
                    gender: npc.gender || 'Maschio',
                    age: npc.age || 'Adulto',
                    status: npc.status || 'Normale',
                    alignment: npc.alignment || 'Neutrale',
                    occupation: npc.details.occupation || '',
                    appearance: npc.details.appearance || '',
                    personality: npc.details.personality || '',
                    mannerism: npc.details.mannerism || '',
                    secret: npc.details.secret || '',
                    encounterHook: npc.details.encounterHook || '',
                });
            } else {
                form.reset({
                    name: '', race: '', gender: 'Maschio', age: 'Adulto', status: 'Normale', alignment: 'Neutrale',
                    occupation: '', appearance: '', personality: '', mannerism: '', secret: '', encounterHook: '',
                });
            }
        }
    }, [open, npc?.id, form]);

    const handleSubmit = async (values: NpcEditFormData) => {
        const details: NpcDetails = {
            name: values.name,
            race: values.race,
            occupation: values.occupation,
            appearance: values.appearance,
            personality: values.personality,
            mannerism: values.mannerism,
            secret: values.secret,
            encounterHook: values.encounterHook,
        };

        const res = await actions.saveNpc({
            id: npc?.id,
            campaignId,
            name: values.name,
            race: values.race,
            gender: values.gender,
            age: values.age,
            status: values.status,
            alignment: values.alignment,
            details: JSON.stringify(details),
        });

        if (res.success) {
            toast({ title: npc ? "Scheda PNG Aggiornata!" : "Nuovo PNG Creato!" });
            onOpenChange(false);
            onSaved();
        } else {
            toast({ variant: 'destructive', title: "Errore", description: res.error });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl max-h-[95vh] w-[95vw] sm:w-full flex flex-col p-0 overflow-hidden outline-none">
                <DialogHeader className="p-6 pb-2 border-b bg-muted/10">
                    <DialogTitle className="font-headline text-2xl">
                        {npc ? `Modifica PNG: ${npc.name}` : "Crea Nuovo PNG"}
                    </DialogTitle>
                    <DialogDescription>
                        {npc ? "Rifinisci l'identità, la psicologia e i segreti del personaggio." : "Inserisci i dati per dare vita a un nuovo abitante del tuo mondo."}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto px-6">
                    <Form {...form}>
                        <form id={formId} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="race" render={({ field }) => (
                                    <FormItem><FormLabel>Razza</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="occupation" render={({ field }) => (
                                    <FormItem><FormLabel>Occupazione / Ruolo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <FormField control={form.control} name="gender" render={({ field }) => (
                                    <FormItem><FormLabel>Genere</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="Maschio">Maschio</SelectItem>
                                                <SelectItem value="Femmina">Femmina</SelectItem>
                                                <SelectItem value="Non binario">Non binario</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    <FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="age" render={({ field }) => (
                                    <FormItem><FormLabel>Età</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="Bambino">Bambino</SelectItem>
                                                <SelectItem value="Ragazzo">Ragazzo</SelectItem>
                                                <SelectItem value="Adulto">Adulto</SelectItem>
                                                <SelectItem value="Vecchio">Vecchio</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    <FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="status" render={({ field }) => (
                                    <FormItem><FormLabel>Stato Sociale</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="Miserabile">Miserabile</SelectItem>
                                                <SelectItem value="Povero">Povero</SelectItem>
                                                <SelectItem value="Normale">Normale</SelectItem>
                                                <SelectItem value="Ricco">Ricco</SelectItem>
                                                <SelectItem value="Sfarzoso">Sfarzoso</SelectItem>
                                                <SelectItem value="Nobile">Nobile</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    <FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="alignment" render={({ field }) => (
                                    <FormItem><FormLabel>Allineamento</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="Buono">Buono</SelectItem>
                                                <SelectItem value="Neutrale">Neutrale</SelectItem>
                                                <SelectItem value="Malvagio">Malvagio</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    <FormMessage /></FormItem>
                                )} />
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <FormField control={form.control} name="appearance" render={({ field }) => (
                                    <FormItem><FormLabel>Aspetto Fisico (Cosa vedono i PG)</FormLabel><FormControl><Textarea className="min-h-[80px]" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="personality" render={({ field }) => (
                                    <FormItem><FormLabel>Temperamento e Psicologia</FormLabel><FormControl><Textarea className="min-h-[80px]" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="mannerism" render={({ field }) => (
                                    <FormItem><FormLabel>Peculiarità / Tic Memorabile</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>

                            <Separator />

                            <div className="p-4 bg-rose-500/5 rounded-lg border border-rose-500/20 space-y-4">
                                <FormField control={form.control} name="encounterHook" render={({ field }) => (
                                    <FormItem><FormLabel className="text-primary font-bold uppercase text-xs">Dettagli del Primo Incontro</FormLabel><FormControl><Textarea className="bg-background/50" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="secret" render={({ field }) => (
                                    <FormItem><FormLabel className="text-rose-500 font-bold uppercase text-xs">Segreto o Desiderio Proibito</FormLabel><FormControl><Textarea className="bg-background/50" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                        </form>
                    </Form>
                </div>
                <DialogFooter className="p-6 pt-4 border-t bg-muted/20">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Annulla</Button>
                    <Button type="submit" form={formId} disabled={form.formState.isSubmitting}>
                        {npc ? "Salva Scheda Completa" : "Crea PNG"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function NpcSummary({ campaignId, npcs: initialNpcs }: NpcSummaryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingNpcId, setViewingNpcId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [enrichedNpcs, setEnrichedNpcs] = useState<NpcWithLastEvent[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  const [npcToEdit, setNpcToEdit] = useState<NpcWithLastEvent | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [tempEventDesc, setTempEventDesc] = useState('');

  const [isEditingPsychology, setIsEditingPsychology] = useState(false);
  const [isEditingSecret, setIsEditingSecret] = useState(false);
  const [tempPsychology, setTempPsychology] = useState('');
  const [tempSecret, setTempSecret] = useState('');

  const { toast } = useToast();

  const loadData = async () => {
    try {
        const res = await actions.getNpcSummary(campaignId);
        if (res.success && res.data) {
            setEnrichedNpcs(res.data);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [campaignId]);

  const npcList = useMemo(() => {
    const list = enrichedNpcs.length > 0 ? enrichedNpcs : initialNpcs.map(n => ({
        ...n,
        details: JSON.parse(n.details) as NpcDetails,
        lastEvent: null
    }));
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [initialNpcs, enrichedNpcs]);

  const filteredNpcs = useMemo(() => {
    const lower = searchTerm.toLowerCase();
    return npcList.filter(n => 
        n.name.toLowerCase().includes(lower) || 
        n.details.occupation.toLowerCase().includes(lower) ||
        n.race.toLowerCase().includes(lower)
    );
  }, [npcList, searchTerm]);

  const handleViewHistory = async (npc: any) => {
    setIsLoadingHistory(true);
    setViewingNpcId(npc.id);
    setIsEditingPsychology(false);
    setIsEditingSecret(false);
    try {
        const res = await actions.getCharacterHistory(npc.id);
        if (res.success && res.data) {
            setHistoryData(res.data);
        } else throw new Error(res.error || "Impossibile recuperare la cronologia.");
    } catch (e: any) {
        toast({ variant: 'destructive', title: "Errore", description: e.message });
    } finally {
        setIsLoadingHistory(false);
    }
  };

  const handleStartEdit = (npc: NpcWithLastEvent) => {
      setNpcToEdit(npc);
      setIsEditOpen(true);
  };

  const handleStartCreate = () => {
    setNpcToEdit(null);
    setIsEditOpen(true);
  };

  const handleDeleteNpc = async (id: string) => {
      const res = await actions.deleteNpc(id);
      if (res.success) {
          toast({ title: "PNG rimosso dall'Anagrafe." });
          loadData();
      }
  };

  const startEditEvent = (ev: any) => {
    setEditingEventId(ev.id);
    setTempEventDesc(ev.eventDescription);
  };

  const cancelEditEvent = () => {
    setEditingEventId(null);
    setTempEventDesc('');
  };

  const handleSaveEvent = async () => {
    if (!editingEventId || !tempEventDesc.trim()) return;
    const res = await actions.updateCharacterEvent(editingEventId, tempEventDesc);
    if (res.success) {
        toast({ title: "Evento aggiornato!" });
        setHistoryData(prev => prev.map(h => h.id === editingEventId ? { ...h, eventDescription: tempEventDesc } : h));
        setEditingEventId(null);
        loadData();
    }
  };

  const handleDeleteEvent = async (id: string) => {
    const res = await actions.deleteCharacterEvent(id);
    if (res.success) {
        toast({ title: "Evento rimosso." });
        setHistoryData(prev => prev.filter(h => h.id !== id));
        loadData();
    }
  };

  const currentViewingNpc = useMemo(() => npcList.find(n => n.id === viewingNpcId), [npcList, viewingNpcId]);

  const startEditPsychology = () => {
    if (!currentViewingNpc) return;
    setTempPsychology(currentViewingNpc.details.personality);
    setIsEditingPsychology(true);
  };

  const startEditSecret = () => {
    if (!currentViewingNpc) return;
    setTempSecret(currentViewingNpc.details.secret);
    setIsEditingSecret(true);
  };

  const saveQuickEdit = async (field: 'personality' | 'secret') => {
      if (!currentViewingNpc) return;
      
      const newDetails = { 
          ...currentViewingNpc.details, 
          [field]: field === 'personality' ? tempPsychology : tempSecret 
      };

      const res = await actions.saveNpc({
          id: currentViewingNpc.id,
          campaignId,
          name: currentViewingNpc.name,
          race: currentViewingNpc.race,
          gender: currentViewingNpc.gender,
          age: currentViewingNpc.age,
          status: currentViewingNpc.status,
          alignment: currentViewingNpc.alignment,
          details: JSON.stringify(newDetails),
      });

      if (res.success) {
          toast({ title: "Scheda aggiornata!" });
          setIsEditingPsychology(false);
          setIsEditingSecret(false);
          loadData();
      }
  };

  if (isInitialLoading) {
      return (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="font-headline text-lg uppercase tracking-widest">Caricamento PNG...</p>
          </div>
      );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row justify-between items-start gap-4">
        <div className="flex-1">
            <h2 className="font-headline text-3xl flex items-center gap-2">
                <BookUser className="h-7 w-7 text-primary" /> Riepilogo PNG Story
            </h2>
            <p className="text-muted-foreground">Directory centrale di tutti i personaggi incontrati nelle storie.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Cerca per nome o ruolo..." 
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Button size="sm" onClick={handleStartCreate} className="gap-2 shadow-lg shadow-primary/20">
                <UserPlus className="h-4 w-4" />
                Nuovo PNG
            </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredNpcs.map((npc) => (
          <Card key={npc.id} className="group hover:border-primary/50 transition-all flex flex-col bg-card/40 overflow-hidden relative">
            <CardHeader className="pb-3 space-y-2">
                <CardTitle className="font-headline text-2xl text-primary leading-tight break-words w-full">
                    {npc.name}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <Badge variant="secondary" className="text-[10px] h-5 uppercase px-2">{npc.details.occupation}</Badge>
                    <Badge variant="outline" className="text-[10px] h-5 px-2">{npc.race}</Badge>
                    <Badge variant="outline" className="text-[10px] h-5 px-2">{npc.alignment}</Badge>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <div className="space-y-4">
                    <div>
                        <span className="text-[10px] font-bold uppercase text-muted-foreground opacity-70 block mb-1">Psicologia e Aspetto:</span>
                        <p className="text-xs text-muted-foreground italic leading-relaxed line-clamp-3">
                            {npc.details.appearance === 'Dati sensoriali non ancora catalogati.' 
                                ? (npc.lastEvent 
                                    ? `Rilevato nella Sessione ${npc.lastEvent.sessionNumber}: ${npc.lastEvent.sessionTitle}`
                                    : npc.details.encounterHook)
                                : `"${npc.details.appearance}"`
                            }
                        </p>
                    </div>
                    <Separator className="opacity-50" />
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">
                            <History className="h-3 w-3" /> Cronologia Recente
                        </div>
                        <p className="text-[11px] text-foreground/80 leading-relaxed line-clamp-2">
                            {npc.lastEvent ? `"${npc.lastEvent.eventDescription}"` : npc.details.encounterHook}
                        </p>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="pt-0 justify-start gap-2 flex-wrap">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Opzioni PNG">
                            <Settings className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => handleStartEdit(npc)}>
                            <Pencil className="mr-2 h-4 w-4"/> Modifica Scheda
                        </DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                    <Trash2 className="mr-2 h-4 w-4"/> Elimina PNG
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Eliminare {npc.name}?</AlertDialogTitle><AlertDialogDescription>Questa azione rimuoverà il PNG dall'Anagrafe. La sua cronologia nelle sessioni rimarrà, ma non sarà più catalogato come personaggio attivo.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteNpc(npc.id)}>Elimina</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5" onClick={() => handleViewHistory(npc)}>
                    <MessageSquare className="h-3.5 w-3.5" /> Diario Gesta
                </Button>
            </CardFooter>
          </Card>
        ))}

        {filteredNpcs.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl opacity-40">
                <UserCircle className="h-12 w-12 mx-auto mb-4" />
                <p>Nessun personaggio trovato.</p>
            </div>
        )}
      </div>

      <NpcEditDialog 
        npc={npcToEdit} 
        campaignId={campaignId} 
        open={isEditOpen} 
        onOpenChange={setIsEditOpen} 
        onSaved={loadData} 
      />

      <Dialog open={!!viewingNpcId} onOpenChange={(o) => !o && setViewingNpcId(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[95vh] w-[95vw] sm:w-full flex flex-col p-0 overflow-hidden outline-none">
              <DialogHeader className="p-6 pb-2 border-b bg-muted/20">
                  <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <DialogTitle className="font-headline text-2xl truncate">
                                {currentViewingNpc?.name}
                            </DialogTitle>
                            <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => {
                                if (currentViewingNpc) {
                                    setViewingNpcId(null);
                                    handleStartEdit(currentViewingNpc);
                                }
                            }}>
                                <Pencil className="h-3 w-3 mr-1"/> Modifica Scheda
                            </Button>
                          </div>
                          <DialogDescription>
                            {currentViewingNpc?.details.occupation} • {currentViewingNpc?.race}
                          </DialogDescription>
                      </div>
                  </div>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto p-6 pt-2">
                  <div className="space-y-6 py-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                          <div className="p-4 rounded-lg bg-muted/30 border text-xs space-y-2 relative group">
                              <div className="flex items-center justify-between">
                                <span className="font-bold uppercase text-primary/70 flex items-center gap-1.5">
                                    <Brain className="h-3 w-3" /> Psicologia:
                                </span>
                                {!isEditingPsychology && (
                                    <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={startEditPsychology}>
                                        <Pencil className="h-2.5 w-2.5"/>
                                    </Button>
                                )}
                              </div>
                              
                              {isEditingPsychology ? (
                                  <div className="space-y-2 mt-2">
                                      <Textarea 
                                          value={tempPsychology} 
                                          onChange={(e) => setTempPsychology(e.target.value)}
                                          className="text-xs min-h-[100px] bg-background/50"
                                      />
                                      <div className="flex justify-end gap-1.5">
                                          <Button variant="ghost" size="sm" className="h-6 text-[9px]" onClick={() => setIsEditingPsychology(false)}>Annulla</Button>
                                          <Button size="sm" className="h-6 text-[9px]" onClick={() => saveQuickEdit('personality')}>Salva</Button>
                                      </div>
                                  </div>
                              ) : (
                                  <p className="italic">"{currentViewingNpc?.details.personality}"</p>
                              )}
                          </div>

                          <div className="p-4 rounded-lg bg-muted/30 border text-xs space-y-2 relative group">
                              <div className="flex items-center justify-between">
                                <span className="font-bold uppercase text-rose-500/70 flex items-center gap-1.5">
                                    <ShieldAlert className="h-3 w-3" /> Segreto:
                                </span>
                                {!isEditingSecret && (
                                    <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={startEditSecret}>
                                        <Pencil className="h-2.5 w-2.5"/>
                                    </Button>
                                )}
                              </div>
                              
                              {isEditingSecret ? (
                                  <div className="space-y-2 mt-2">
                                      <Textarea 
                                          value={tempSecret} 
                                          onChange={(e) => setTempSecret(e.target.value)}
                                          className="text-xs min-h-[100px] bg-background/50"
                                      />
                                      <div className="flex justify-end gap-1.5">
                                          <Button variant="ghost" size="sm" className="h-6 text-[9px]" onClick={() => setIsEditingSecret(false)}>Annulla</Button>
                                          <Button size="sm" className="h-6 text-[9px]" onClick={() => saveQuickEdit('secret')}>Salva</Button>
                                      </div>
                                  </div>
                              ) : (
                                  <p className="text-destructive/80 font-medium">"{currentViewingNpc?.details.secret}"</p>
                              )}
                          </div>
                      </div>

                      <div className="space-y-4">
                          <h4 className="flex items-center gap-2 text-sm font-bold uppercase text-primary border-b pb-1">
                              <History className="h-4 w-4" /> Cronaca delle Gesta nelle Sessioni
                          </h4>
                          {isLoadingHistory ? (
                              <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>
                          ) : historyData.length > 0 ? (
                              <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-primary/10">
                                  {historyData.map((ev, i) => (
                                      <div key={i} className="relative pl-8 group/item">
                                          <div className="absolute left-0 top-1.5 h-6 w-6 rounded-full bg-background border-2 border-primary/40 flex items-center justify-center z-10">
                                              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                          </div>
                                          <div className="flex justify-between items-start mb-1">
                                              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                                                  Sessione {ev.sessionNumber}: {ev.sessionTitle}
                                              </div>
                                              <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEditEvent(ev)}>
                                                      <Pencil className="h-3 w-3" />
                                                  </Button>
                                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteEvent(ev.id)}>
                                                      <Trash2 className="h-3 w-3" />
                                                  </Button>
                                              </div>
                                          </div>
                                          
                                          {editingEventId === ev.id ? (
                                              <div className="space-y-2 bg-muted/40 p-3 rounded-lg border border-primary/30">
                                                  <Textarea 
                                                      value={tempEventDesc} 
                                                      onChange={(e) => setTempEventDesc(e.target.value)}
                                                      className="text-sm min-h-[80px]"
                                                  />
                                                  <div className="flex justify-end gap-2">
                                                      <Button variant="ghost" size="sm" onClick={cancelEditEvent}>Annulla</Button>
                                                      <Button size="sm" onClick={handleSaveEvent}>Salva Modifica</Button>
                                                  </div>
                                              </div>
                                          ) : (
                                              <div className="p-3 rounded-lg bg-muted/20 border border-border/50 text-sm leading-relaxed text-foreground/90 italic">
                                                  "{ev.eventDescription}"
                                              </div>
                                          )}
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <p className="text-xs text-muted-foreground italic text-center p-8">Il personaggio è stato creato ma non è ancora apparso formalmente in una scena analizzata.</p>
                          )}
                      </div>
                  </div>
              </div>
          </DialogContent>
      </Dialog>
    </div>
  );
}
