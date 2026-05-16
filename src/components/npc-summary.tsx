'use client';

import { useState, useMemo, useEffect, useId, memo } from 'react';
import type { Npc, NpcDetails } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, History, UserCircle, Loader2, MessageSquare, Pencil, Trash2, Check, X, Settings, UserPlus, ChevronDown, ChevronUp, Sparkles, RefreshCw, FileText, Download, User2, Footprints, Fingerprint, ImagePlus } from 'lucide-react';
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from './ui/scroll-area';
import { Switch } from './ui/switch';
import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import Image from 'next/image';
import { Label } from './ui/label';

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
  mannerism: z.string().optional(),
  secret: z.string().optional(),
  encounterHook: z.string().optional(),
  imageUrl: z.string().optional().nullable(),
});

type NpcEditFormData = z.infer<typeof npcEditSchema>;

function NpcEditDialog({ npc, campaignId, open, onOpenChange, onSaved }: { npc: NpcWithLastEvent | null, campaignId: string, open: boolean, onOpenChange: (open: boolean) => void, onSaved: () => void }) {
    const [isUploading, setIsUploading] = useState(false);
    const formId = useId();
    const { toast } = useToast();

    const form = useForm<NpcEditFormData>({
        resolver: zodResolver(npcEditSchema),
        defaultValues: {
            name: '', race: '', gender: 'Maschio', age: 'Adulto', status: 'Normale', alignment: 'Neutrale',
            occupation: '', appearance: '', personality: '', mannerism: '', secret: '', encounterHook: '', imageUrl: '',
        },
    });

    useEffect(() => {
        if (open) {
            if (npc) {
                form.reset({
                    name: npc.name || '',
                    race: npc.race || '',
                    gender: npc.gender || npc.details.gender || 'Maschio',
                    age: npc.age || npc.details.age || 'Adulto',
                    status: npc.status || npc.details.status || 'Normale',
                    alignment: npc.alignment || npc.details.alignment || 'Neutrale',
                    occupation: npc.details.occupation || '',
                    appearance: npc.details.appearance || '',
                    personality: npc.details.personality || '',
                    mannerism: npc.details.mannerism || '',
                    secret: npc.details.secret || '',
                    encounterHook: npc.details.encounterHook || '',
                    imageUrl: npc.details.imageUrl || '',
                });
            } else {
                form.reset({
                    name: '', race: '', gender: 'Maschio', age: 'Adulto', status: 'Normale', alignment: 'Neutrale',
                    occupation: '', appearance: '', personality: '', mannerism: '', secret: '', encounterHook: '', imageUrl: '',
                });
            }
        }
    }, [open, npc?.id, form]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const result = await actions.uploadGenericImage(event.target?.result as string);
            if (result.success && result.data) {
                form.setValue('imageUrl', result.data.url);
                toast({ title: "Ritratto caricato!" });
            } else {
                toast({ variant: 'destructive', title: "Errore caricamento", description: result.error });
            }
            setIsUploading(false);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (values: NpcEditFormData) => {
        const details: NpcDetails = {
            ...values,
            mannerism: values.mannerism || '',
            secret: values.secret || '',
            encounterHook: values.encounterHook || '',
            imageUrl: values.imageUrl || '',
        } as NpcDetails;

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
                    <DialogTitle className="font-headline text-2xl text-left">
                        {npc ? `Modifica PNG: ${npc.name}` : "Crea Nuovo PNG"}
                    </DialogTitle>
                    <DialogDescription className="text-left">
                        Inserisci i dati per dare vita a un nuovo abitante del tuo mondo.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto px-6">
                    <Form {...form}>
                        <form id={formId} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-6 text-left">
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="w-full md:w-48 space-y-2 shrink-0 flex flex-col items-center">
                                    <Label>Ritratto (Avatar)</Label>
                                    <div className="relative h-40 w-40 rounded-full overflow-hidden border-2 border-dashed flex items-center justify-center group shadow-lg bg-muted">
                                        {form.watch('imageUrl') ? (
                                            <img src={form.watch('imageUrl')!} alt="Ritratto" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="text-center p-4">
                                                <ImagePlus className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                                                <p className="text-[10px] text-muted-foreground">Clicca per caricare</p>
                                            </div>
                                        )}
                                        <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" disabled={isUploading} />
                                        {isUploading && <div className="absolute inset-0 bg-background/50 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}
                                    </div>
                                    <Button variant="link" size="sm" className="p-0 h-auto text-[10px]" onClick={() => form.setValue('imageUrl', '')}>Rimuovi</Button>
                                </div>

                                <div className="flex-1 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                                        <FormField control={form.control} name="name" render={({ field }) => (
                                            <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="race" render={({ field }) => (
                                            <FormItem><FormLabel>Razza</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="occupation" render={({ field }) => (
                                            <FormItem><FormLabel>Occupazione / Ruolo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
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
                                                <FormMessage />
                                            </FormItem>
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
                                                        <SelectItem value="Legale Buono">Legale Buono</SelectItem>
                                                        <SelectItem value="Neutrale Buono">Neutrale Buono</SelectItem>
                                                        <SelectItem value="Caotico Buono">Caotico Buono</SelectItem>
                                                        <SelectItem value="Legale Neutrale">Legale Neutrale</SelectItem>
                                                        <SelectItem value="Neutrale">Neutrale</SelectItem>
                                                        <SelectItem value="Caotico Neutrale">Caotico Neutrale</SelectItem>
                                                        <SelectItem value="Legale Malvagio">Legale Malvagio</SelectItem>
                                                        <SelectItem value="Neutrale Malvagio">Neutrale Malvagio</SelectItem>
                                                        <SelectItem value="Caotico Malvagio">Caotico Malvagio</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            <FormMessage /></FormItem>
                                        )} />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4 text-left">
                                <FormField control={form.control} name="appearance" render={({ field }) => (
                                    <FormItem><FormLabel>Aspetto Fisico</FormLabel><FormControl><Textarea className="min-h-[80px]" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="personality" render={({ field }) => (
                                    <FormItem><FormLabel>Temperamento e Psicologia</FormLabel><FormControl><Textarea className="min-h-[80px]" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="mannerism" render={({ field }) => (
                                    <FormItem><FormLabel>Peculiarità / Tic Memorabile</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>

                            <Separator />

                            <div className="p-4 bg-rose-500/5 rounded-lg border border-rose-500/20 space-y-4 text-left">
                                <FormField control={form.control} name="encounterHook" render={({ field }) => (
                                    <FormItem><FormLabel className="text-primary font-bold uppercase text-xs">Dettagli del Primo Incontro</FormLabel><FormControl><Textarea className="bg-background/50" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="secret" render={({ field }) => (
                                    <FormItem><FormLabel className="text-rose-500 font-bold uppercase text-xs">Segreto o Desiderio Proibito</FormLabel><FormControl><Textarea className="bg-background/50" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                        </form>
                    </Form>
                </div>
                <DialogFooter className="p-6 pt-4 border-t bg-muted/20">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Annulla</Button>
                    <Button type="submit" form={formId} disabled={form.formState.isSubmitting || isUploading}>
                        Salva PNG
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const HandoutPreview = memo(({ npc, config, historyData, isForPrinting = false }: { npc: NpcWithLastEvent, config: any, historyData: any[], isForPrinting?: boolean }) => {
    // Definizione dell'ombra protettiva per il testo su sfondo denso (pergamena color #f4e4bc)
    const protectiveShadow = { textShadow: '0 0 10px #f4e4bc, 0 0 4px #f4e4bc, 0 0 1px #f4e4bc' };

    return (
        <div 
            style={{ 
                width: '794px', 
                minHeight: '1123px',
                height: 'auto',
                backgroundColor: '#f4e4bc',
                backgroundImage: "url('/api/assets/handout-background.jpg')",
                backgroundSize: 'cover',
                backgroundPosition: 'top center',
                color: '#000000',
                padding: '60px 80px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'visible',
                boxSizing: 'border-box',
                imageRendering: '-webkit-optimize-contrast',
                textRendering: 'optimizeLegibility',
                WebkitFontSmoothing: 'antialiased'
            }}
            className={cn(!isForPrinting && "shadow-2xl border")}
        >
            {/* RITRATTO IN FILIGRANA: DENSITÀ AUMENTATA (opacity-60) */}
            {npc.details.imageUrl && (
                <div className="absolute top-0 right-0 p-4 opacity-60 z-0 pointer-events-none">
                    <div className="h-[320px] w-[320px] rounded-full overflow-hidden border-[8px] border-black/10 grayscale-[0.2] contrast-[1.1] brightness-[1.05]">
                        <img src={npc.details.imageUrl} alt={npc.name} className="h-full w-full object-cover" />
                    </div>
                </div>
            )}

            <div className="absolute top-0 left-0 p-8 opacity-5">
                <UserCircle className="h-48 w-48" />
            </div>

            <header className="mb-12 border-b-2 border-black/30 pb-6 relative z-10 text-center">
                <div className="flex flex-col items-center w-full text-center">
                    <h1 
                        className="font-authority text-5xl uppercase tracking-widest text-black mb-2 text-center w-full leading-tight drop-shadow-sm"
                        style={protectiveShadow}
                    >
                        {npc.name}
                    </h1>
                    <div 
                        className="flex justify-center items-center gap-4 font-headline text-lg uppercase tracking-wider text-black/80 w-full text-center"
                        style={protectiveShadow}
                    >
                        <span>{npc.race}</span>
                        <span className="opacity-40">|</span>
                        <span>{npc.details.occupation}</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 space-y-10 relative z-10 text-black">
                {config.showAppearance && (
                    <section className="space-y-3">
                        <h2 className="font-authority text-xl uppercase tracking-widest text-black border-b border-black/20 pb-1 text-left" style={protectiveShadow}>Descrizione Fisica</h2>
                        <p className="font-body text-lg leading-relaxed italic text-black whitespace-pre-wrap text-left" style={protectiveShadow}>
                            "{npc.details.appearance}"
                        </p>
                    </section>
                )}

                {config.showPersonality && (
                    <section className="space-y-3">
                        <h2 className="font-authority text-xl uppercase tracking-widest text-black border-b border-black/20 pb-1 text-left" style={protectiveShadow}>Tratti Caratteriali</h2>
                        <p className="font-body text-lg leading-relaxed text-black whitespace-pre-wrap text-left" style={protectiveShadow}>
                            {npc.details.personality}
                        </p>
                    </section>
                )}

                {config.selectedEvents.length > 0 && (
                    <section className="space-y-4">
                        <h2 className="font-authority text-xl uppercase tracking-widest text-black border-b border-black/20 pb-1 text-left" style={protectiveShadow}>Cronaca degli Incontri</h2>
                        <div className="space-y-6">
                            {historyData.filter(ev => config.selectedEvents.includes(ev.id)).reverse().map((ev, i) => (
                                <div key={i} className="space-y-1">
                                    <div className="text-[11px] font-headline uppercase tracking-wider text-black/60 text-left" style={protectiveShadow}>Dalle Cronache della Sessione {ev.sessionNumber}</div>
                                    <p className="font-handwriting text-xl leading-snug text-black/80 pl-4 border-l-2 border-black/10 text-left" style={protectiveShadow}>
                                        {ev.eventDescription}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>

            <footer className="mt-20 pt-8 border-t border-black/20 flex justify-between items-center opacity-40">
                <div className="font-authority text-[10px] uppercase tracking-[0.3em]">Archivio del Tessitore di Cronache</div>
                <div className="font-headline text-[10px] uppercase tracking-widest italic">{new Date().toLocaleDateString('it-IT')}</div>
            </footer>
        </div>
    );
});
HandoutPreview.displayName = 'HandoutPreview';

function NpcHandoutDialog({ npc, campaignId, open, onOpenChange }: { npc: NpcWithLastEvent, campaignId: string, open: boolean, onOpenChange: (open: boolean) => void }) {
    const [config, setConfig] = useState({
        showAppearance: true,
        showPersonality: true,
        selectedEvents: [] as string[]
    });
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            const load = async () => {
                setIsLoading(true);
                const res = await actions.getCharacterHistory(npc.id);
                if (res.success && res.data) {
                    setHistoryData(res.data);
                    setConfig(prev => ({ ...prev, selectedEvents: res.data.map((h: any) => h.id) }));
                }
                setIsLoading(false);
            };
            load();
        }
    }, [open, npc.id]);

    const handleDownload = async () => {
        if (typeof document === 'undefined' || !document.body) return;
        setIsGenerating(true);
        toast({ title: "Generazione Dossier..." });

        const printContainer = document.createElement('div');
        printContainer.style.position = 'fixed';
        printContainer.style.left = '-10000px';
        printContainer.style.top = '-10000px';
        printContainer.style.width = '794px';
        printContainer.style.height = 'auto';
        printContainer.style.backgroundColor = 'white';
        printContainer.style.zIndex = '-9999';
        document.body.appendChild(printContainer);

        const root = createRoot(printContainer);
        
        try {
            root.render(<HandoutPreview npc={npc} config={config} historyData={historyData} isForPrinting />);
            await new Promise(resolve => setTimeout(resolve, 1500));

            const canvas = await html2canvas(printContainer, {
                scale: 3,
                useCORS: true,
                backgroundColor: '#f4e4bc',
                logging: false,
                height: printContainer.scrollHeight,
                windowHeight: printContainer.scrollHeight
            });

            const link = document.createElement('a');
            link.download = `Handout_${npc.name.replace(/\s+/g, '_')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast({ title: "Dossier scaricato correttamente!" });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Errore", description: "Impossibile generare l'handout." });
        } finally {
            root.unmount();
            if (document.body.contains(printContainer)) document.body.removeChild(printContainer);
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] sm:max-w-6xl h-[90vh] flex flex-col p-0 outline-none">
                <DialogHeader className="p-6 pb-2 border-b">
                    <DialogTitle className="font-headline text-2xl flex items-center gap-2">
                        <FileText className="h-6 w-6 text-primary" /> Esporta Dossier
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                    <div className="w-full lg:w-80 border-r p-6 overflow-y-auto space-y-6 bg-muted/10 shrink-0">
                        <div className="space-y-3">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Campi Visibili</Label>
                            <div className="flex items-center justify-between p-2 rounded-lg border bg-background">
                                <span className="text-xs">Aspetto</span>
                                <Switch checked={config.showAppearance} onCheckedChange={(v) => setConfig(p => ({...p, showAppearance: v}))} />
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-lg border bg-background">
                                <span className="text-xs">Psicologia</span>
                                <Switch checked={config.showPersonality} onCheckedChange={(v) => setConfig(p => ({...p, showPersonality: v}))} />
                            </div>
                        </div>
                        <div className="space-y-3 text-left">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Cronaca Gesta</Label>
                            {isLoading ? <div className="flex justify-center"><Loader2 className="animate-spin h-4 w-4" /></div> : (
                                <div className="space-y-2">
                                    {historyData.map(ev => (
                                        <div key={ev.id} onClick={() => setConfig(p => ({ ...p, selectedEvents: p.selectedEvents.includes(ev.id) ? p.selectedEvents.filter(id => id !== ev.id) : [...p.selectedEvents, ev.id] }))} className={cn("p-2 rounded border cursor-pointer text-[10px] flex gap-2 text-left", config.selectedEvents.includes(ev.id) ? "bg-primary/10 border-primary" : "opacity-60")}>
                                            <div className="flex-1 italic truncate">"{ev.eventDescription}"</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 bg-zinc-900 p-4 overflow-auto flex justify-center items-start">
                        <div style={{ transform: 'scale(0.55)', transformOrigin: 'top center' }}>
                            <HandoutPreview npc={npc} config={config} historyData={historyData} />
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-4 border-t bg-muted/20">
                    <Button onClick={handleDownload} disabled={isGenerating} className="w-full">
                        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                        Scarica Handout (PNG)
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
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [isElaboratingId, setIsElaboratingId] = useState<string | null>(null);
  const [isDeepAnalyzingId, setIsDeepAnalyzingId] = useState<string | null>(null);
  const [npcToEdit, setNpcToEdit] = useState<NpcWithLastEvent | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [handoutNpc, setHandoutNpc] = useState<NpcWithLastEvent | null>(null);
  const [isEditingPsychology, setIsEditingPsychology] = useState(false);
  const [isEditingSecret, setIsEditingSecret] = useState(false);
  const [tempPsychology, setTempPsychology] = useState('');
  const [tempSecret, setTempSecret] = useState('');

  const { toast } = useToast();

  const loadData = async () => {
    try {
        const res = await actions.getNpcSummary(campaignId);
        if (res.success && res.data) setEnrichedNpcs(res.data);
    } catch (e) { console.error(e); } finally { setIsInitialLoading(false); }
  };

  useEffect(() => { loadData(); }, [campaignId]);

  const npcList = useMemo(() => {
    const list = enrichedNpcs.length > 0 ? enrichedNpcs : initialNpcs.map(n => ({ ...n, details: JSON.parse(n.details) as NpcDetails, lastEvent: null }));
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [initialNpcs, enrichedNpcs]);

  const filteredNpcs = useMemo(() => {
    const lower = searchTerm.toLowerCase();
    return npcList.filter(n => n.name.toLowerCase().includes(lower) || n.details.occupation.toLowerCase().includes(lower) || n.race.toLowerCase().includes(lower));
  }, [npcList, searchTerm]);

  const handleViewHistory = async (npcId: string) => {
    setIsLoadingHistory(true);
    setViewingNpcId(npcId);
    setIsEditingPsychology(false);
    setIsEditingSecret(false);
    try {
        const res = await actions.getCharacterHistory(npcId);
        if (res.success && res.data) setHistoryData(res.data);
    } catch (e: any) { toast({ variant: 'destructive', title: "Errore", description: e.message }); } finally { setIsLoadingHistory(false); }
  };

  const handleElaborateIdentity = async (npcId: string) => {
    setIsElaboratingId(npcId);
    try {
        const res = await actions.updateNpcIdentityAction(npcId, campaignId);
        if (res.success) {
            toast({ title: "Identità Elaborata!" });
            await loadData();
            if (viewingNpcId === npcId) await handleViewHistory(npcId);
        }
    } catch (e: any) { toast({ variant: 'destructive', title: "Errore", description: e.message }); } finally { setIsElaboratingId(null); }
  };

  const handleDeepAnalysis = async (npcId: string) => {
    setIsDeepAnalyzingId(npcId);
    try {
        const res = await actions.deepNpcElaborationAction(npcId, campaignId);
        if (res.success) {
            toast({ title: "Analisi Profonda Completata!" });
            await loadData();
            if (viewingNpcId === npcId) await handleViewHistory(npcId);
        }
    } catch (e: any) { toast({ variant: 'destructive', title: "Errore", description: e.message }); } finally { setIsDeepAnalyzingId(null); }
  };

  const handleDeleteNpc = async (id: string) => {
      const res = await actions.deleteNpc(id);
      if (res.success) { toast({ title: "PNG rimosso." }); loadData(); }
  };

  const saveQuickEdit = async (field: 'personality' | 'secret') => {
      const npc = npcList.find(n => n.id === viewingNpcId);
      if (!npc) return;
      const newDetails = { ...npc.details, [field]: field === 'personality' ? tempPsychology : tempSecret };
      const res = await actions.saveNpc({ id: npc.id, campaignId, name: npc.name, race: npc.race, gender: npc.gender, age: npc.age, status: npc.status, alignment: npc.alignment, details: JSON.stringify(newDetails) });
      if (res.success) { toast({ title: "Aggiornato!" }); setIsEditingPsychology(false); setIsEditingSecret(false); loadData(); }
  };

  if (isInitialLoading) return <div className="flex flex-col items-center justify-center py-20 gap-4"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="font-headline uppercase">Caricamento...</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 max-sm:w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cerca PNG..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => { setNpcToEdit(null); setIsEditOpen(true); }} className="gap-2 shadow-lg max-sm:w-full"><UserPlus className="h-4 w-4" /> Nuovo PNG</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {filteredNpcs.map((npc) => {
          const isAnalyzing = isElaboratingId === npc.id || isDeepAnalyzingId === npc.id;
          
          return (
            <Card key={npc.id} className={cn("group hover:border-primary/50 transition-all flex flex-col bg-card/40 overflow-hidden relative min-h-[250px]", isAnalyzing && "opacity-80")}>
              {isAnalyzing && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] animate-in fade-in duration-300 text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-[10px] font-bold uppercase mt-3 text-primary tracking-widest animate-pulse">
                        {isDeepAnalyzingId === npc.id ? "Analisi Profonda..." : "Elaborazione..."}
                    </p>
                </div>
              )}
              
              <CardHeader className="p-4 pb-2">
                  <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-full overflow-hidden border bg-muted shrink-0 relative shadow-inner">
                          {npc.details.imageUrl ? <img src={npc.details.imageUrl} alt={npc.name} className="h-full w-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center opacity-10"><User2 className="h-8 w-8" /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                          <CardTitle className="font-headline text-lg text-primary leading-tight truncate text-left">{npc.name}</CardTitle>
                          <div className="flex flex-wrap gap-1 mt-1">
                              <Badge variant="secondary" className="text-[8px] h-3.5 uppercase px-1">{npc.details.occupation}</Badge>
                              <Badge variant="outline" className="text-[8px] h-3.5 px-1">{npc.race}</Badge>
                          </div>
                      </div>
                  </div>
              </CardHeader>
              <CardContent className="p-4 pt-3 flex-grow space-y-3">
                  <div className="space-y-1">
                      <span className="text-[9px] font-bold uppercase text-muted-foreground opacity-70 flex items-center">Identità e Psicologia</span>
                      <p className={cn("text-xs text-muted-foreground italic leading-relaxed text-left", !expandedCards[npc.id] ? "line-clamp-2" : "line-clamp-none")}>
                          "{npc.details.appearance === 'Dati sensoriali in attesa di catalogo.' ? npc.details.encounterHook : npc.details.appearance}"
                      </p>
                      <Button variant="link" className="h-auto p-0 text-[9px] uppercase font-bold" onClick={() => setExpandedCards(p => ({...p, [npc.id]: !p[npc.id]}))}>{expandedCards[npc.id] ? "Riduci" : "Altro..."}</Button>
                  </div>

                  {!!npc.details.mannerism && (
                      <div className="bg-primary/5 p-2 rounded-md border border-primary/10 animate-in fade-in">
                          <span className="text-[9px] font-bold uppercase text-primary/70 flex items-center gap-1"><Fingerprint className="h-2.5 w-2.5" /> Peculiarità</span>
                          <p className="text-[11px] italic text-left">"{npc.details.mannerism}"</p>
                      </div>
                  )}

                  {!!npc.details.encounterHook && (
                      <div className="bg-muted/30 p-2 rounded-md border animate-in fade-in">
                          <span className="text-[9px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Footprints className="h-2.5 w-2.5" /> Primo Incontro</span>
                          <p className="text-[11px] leading-tight text-foreground/70 text-left">"{npc.details.encounterHook}"</p>
                      </div>
                  )}
              </CardContent>
              <CardFooter className="p-4 pt-0 justify-start gap-2">
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isAnalyzing}><Settings className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => { setNpcToEdit(npc); setIsEditOpen(true); }}><Pencil className="mr-2 h-4 w-4"/> Modifica Scheda</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setHandoutNpc(npc)}><FileText className="mr-2 h-4 w-4 text-emerald-500"/> Esporta Handout</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleElaborateIdentity(npc.id)}><Sparkles className="mr-2 h-4 w-4 text-accent"/> Elabora Veloce</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeepAnalysis(npc.id)}><RefreshCw className="mr-2 h-4 w-4 text-primary"/> Analisi Profonda</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                              <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">Elimina</DropdownMenuItem></AlertDialogTrigger>
                              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminare {npc.name}?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annulla</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteNpc(npc.id)}>Elimina</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                          </AlertDialog>
                      </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => handleViewHistory(npc.id)} disabled={isAnalyzing}><MessageSquare className="h-3.5 w-3.5" /> Diario</Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <NpcEditDialog npc={npcToEdit} campaignId={campaignId} open={isEditOpen} onOpenChange={setIsEditOpen} onSaved={loadData} />
      {handoutNpc && <NpcHandoutDialog npc={handoutNpc} campaignId={campaignId} open={!!handoutNpc} onOpenChange={(o) => !o && setHandoutNpc(null)} />}

      <Dialog open={!!viewingNpcId} onOpenChange={(o) => !o && setViewingNpcId(null)}>
          <DialogContent className="sm:max-w-3xl h-[90vh] flex flex-col p-0 overflow-hidden outline-none">
              <DialogHeader className="p-6 border-b bg-muted/20">
                  <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full overflow-hidden border bg-background shrink-0 relative shadow-md">
                          {npcList.find(n => n.id === viewingNpcId)?.details.imageUrl ? <img src={npcList.find(n => n.id === viewingNpcId)!.details.imageUrl!} alt="Ritratto" className="h-full w-full object-cover" /> : <User2 className="h-full w-full p-3 opacity-20" />}
                      </div>
                      <div className="text-left">
                          <DialogTitle className="font-headline text-2xl">{npcList.find(n => n.id === viewingNpcId)?.name}</DialogTitle>
                          <DialogDescription className="flex gap-2 mt-1">
                              <Badge variant="secondary">{npcList.find(n => n.id === viewingNpcId)?.details.occupation}</Badge>
                              <Badge variant="outline">{npcList.find(n => n.id === viewingNpcId)?.race}</Badge>
                          </DialogDescription>
                      </div>
                  </div>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { id: 'gender', label: 'Genere' },
                        { id: 'age', label: 'Età' },
                        { id: 'status', label: 'Stato Sociale' },
                        { id: 'alignment', label: 'Allineamento' }
                      ].map(f => (
                          <div key={f.id} className="bg-primary/5 border rounded p-2 text-center">
                              <span className="text-[8px] uppercase font-bold text-muted-foreground block">{f.label}</span>
                              <span className="text-xs">
                                {
                                  (npcList.find(n => n.id === viewingNpcId) as any)?.[f.id] || 
                                  (npcList.find(n => n.id === viewingNpcId) as any)?.details?.[f.id] || 
                                  '—'
                                }
                              </span>
                          </div>
                      ))}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-muted/30 border text-xs relative group">
                          <div className="flex justify-between font-bold text-primary/70 mb-2 uppercase">Psicologia <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => { setTempPsychology(npcList.find(n => n.id === viewingNpcId)!.details.personality); setIsEditingPsychology(true); }}><Pencil className="h-3 w-3"/></Button></div>
                          {isEditingPsychology ? <div className="space-y-2"><Textarea value={tempPsychology} onChange={(e) => setTempPsychology(e.target.value)} className="text-xs h-24" /><Button size="sm" onClick={() => saveQuickEdit('personality')} className="w-full h-6 text-[9px]">Salva</Button></div> : <p className="italic">"{npcList.find(n => n.id === viewingNpcId)?.details.personality}"</p>}
                      </div>
                      <div className="p-4 rounded-lg bg-rose-500/5 border text-xs relative">
                          <div className="flex justify-between font-bold text-rose-500/70 mb-2 uppercase">Segreto <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => { setTempSecret(npcList.find(n => n.id === viewingNpcId)!.details.secret); setIsEditingSecret(true); }}><Pencil className="h-3 w-3"/></Button></div>
                          {isEditingSecret ? <div className="space-y-2"><Textarea value={tempSecret} onChange={(e) => setTempSecret(e.target.value)} className="text-xs h-24" /><Button size="sm" onClick={() => saveQuickEdit('secret')} className="w-full h-6 text-[9px]">Salva</Button></div> : <p className="text-destructive font-medium">"{npcList.find(n => n.id === viewingNpcId)?.details.secret}"</p>}
                      </div>
                  </div>
                  <div className="space-y-4">
                      <h4 className="flex items-center gap-2 text-sm font-bold uppercase text-primary border-b pb-1"><History className="h-4 w-4" /> Diario delle Gesta</h4>
                      {isLoadingHistory ? <div className="flex justify-center"><Loader2 className="animate-spin" /></div> : historyData.map((ev, i) => (
                          <div key={i} className="border-l-2 border-primary/20 pl-4 py-2 group/ev text-left">
                              <div className="flex justify-between items-center mb-1">
                                  <span className="text-[9px] font-bold text-muted-foreground uppercase">Sess. {ev.sessionNumber}</span>
                                  <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover/ev:opacity-100" onClick={() => actions.deleteCharacterEvent(ev.id).then(() => handleViewHistory(viewingNpcId!))}><Trash2 className="h-3 w-3"/></Button>
                              </div>
                              <p className="text-sm italic text-foreground/80">"{ev.eventDescription}"</p>
                          </div>
                      ))}
                  </div>
              </div>
          </DialogContent>
      </Dialog>
    </div>
  );
}