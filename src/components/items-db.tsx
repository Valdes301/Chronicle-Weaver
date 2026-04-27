
'use client';

import { useState, useMemo, useEffect, useId } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem } from '@/components/ui/accordion';
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Badge } from '@/components/ui/badge';
import { Sparkles, PlusCircle, Plus, Pencil, Trash2, ChevronDown, CheckCircle, Filter, ArrowUp, Coins } from 'lucide-react';
import type { MagicItem } from '@/lib/types';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Textarea } from './ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from './ui/dropdown-menu';
import { Label } from './ui/label';
import { Switch } from './ui/switch';


const DetailItem = ({ label, value }: { label: string, value?: React.ReactNode }) => {
    if (!value) return null;
    return <p><strong>{label}:</strong> {String(value)}</p>;
}

const magicItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Il nome è obbligatorio."),
  type: z.string().min(1, "Il tipo è obbligatorio."),
  rarity: z.string().min(1, "La rarità è obbligatoria."),
  attunement: z.string().optional(),
  description: z.string().min(1, "La descrizione è obbligatoria."),
  cost: z.string().optional(),
});

type MagicItemFormData = z.infer<typeof magicItemSchema>;


function MagicItemFormDialog({ item, campaignId, trigger, onSave }: { item?: Partial<MagicItem>, campaignId: string, trigger: React.ReactNode, onSave: (data: Partial<MagicItem> & { campaignId: string }) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const formId = useId();

    const form = useForm<MagicItemFormData>({
        resolver: zodResolver(magicItemSchema),
        defaultValues: {
            id: item?.id,
            name: item?.name ?? '',
            type: item?.type ?? 'Oggetto meraviglioso',
            rarity: item?.rarity ?? 'Comune',
            attunement: item?.attunement ?? 'No',
            description: item?.description ?? '',
            cost: item?.cost ?? '',
        },
    });

    useEffect(() => {
        if(isOpen) {
            form.reset({
                id: item?.id,
                name: item?.name ?? '',
                type: item?.type ?? 'Oggetto meraviglioso',
                rarity: item?.rarity ?? 'Comune',
                attunement: item?.attunement ?? 'No',
                description: item?.description ?? '',
                cost: item?.cost ?? '',
            });
        }
    }, [isOpen, item, form]);

    const handleSubmit = async (values: MagicItemFormData) => {
        await onSave({ ...values, attunement: values.attunement ?? 'No', campaignId });
        setIsOpen(false);
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="grid grid-rows-[auto_1fr_auto] max-h-[90vh] p-0">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>{item?.id ? 'Modifica Oggetto' : 'Nuovo Oggetto'}</DialogTitle>
                    <DialogDescription>Inserisci i dettagli del tuo oggetto personalizzato.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="px-6 border-y">
                    <Form {...form}>
                        <form id={formId} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
                            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Tipo</FormLabel><FormControl><Input placeholder="es. Oggetto meraviglioso, Pozione..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="rarity" render={({ field }) => (<FormItem><FormLabel>Rarità</FormLabel><FormControl><Input placeholder="es. Comune, Non comune, Rara..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="cost" render={({ field }) => (<FormItem><FormLabel>Costo</FormLabel><FormControl><Input placeholder="es. 500 mo" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="attunement" render={({ field }) => (<FormItem><FormLabel>Sintonia</FormLabel><FormControl><Input placeholder="es. Sì, No, Sì (da un mago)..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Descrizione</FormLabel><FormControl><Textarea className="min-h-[120px]" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </form>
                    </Form>
                </ScrollArea>
                <DialogFooter className="p-6 pt-4">
                    <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Annulla</Button>
                    <Button type="submit" form={formId} disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Salvataggio...' : 'Salva'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface ItemsDbProps {
    magicItems: MagicItem[];
    campaignId: string;
    possessedItems: string[];
    onSaveItem: (item: Partial<MagicItem> & { campaignId: string }) => void;
    onDeleteItem: (id: string) => void;
    onTogglePossession: (itemName: string) => void;
}

const parseCost = (costString?: string | null): number => {
    if (!costString) return 0;
    const cleanedCost = costString.replace(/[,.]/g, '').toLowerCase();
    const value = parseInt(cleanedCost, 10);
    if (isNaN(value)) return 0;

    if (cleanedCost.includes('mo')) return value * 100;
    if (cleanedCost.includes('ma')) return value * 10;
    if (cleanedCost.includes('mr') || cleanedCost.includes('pc')) return value;
    
    return value * 100; // Default a mo se non specificato
};

const rarities = ["Comune", "Non comune", "Rara", "Molto rara", "Leggendaria", "Artefatto", "Varia"];
const rarityOrder = rarities;

export function ItemsDb({ magicItems, campaignId, possessedItems, onSaveItem, onDeleteItem, onTogglePossession }: ItemsDbProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('alphabetical');
  const [showPossessed, setShowPossessed] = useState(false);
  const [selectedRarities, setSelectedRarities] = useState<string[]>([]);

  const handleRarityChange = (rarity: string) => {
    setSelectedRarities(prev => 
      prev.includes(rarity) 
        ? prev.filter(r => r !== rarity) 
        : [...prev, rarity]
    );
  };

  const filteredAndSortedItems = useMemo(() => {
    let items = [...magicItems];

    if (search) {
      const lowerCaseSearch = search.toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(lowerCaseSearch) ||
        (item.type?.toLowerCase() ?? '').includes(lowerCaseSearch) ||
        (item.rarity?.toLowerCase() ?? '').includes(lowerCaseSearch) ||
        (item.description?.toLowerCase() ?? '').includes(lowerCaseSearch)
      );
    }
    
    if (showPossessed) {
        items = items.filter(item => possessedItems.includes(item.name));
    }

    if (selectedRarities.length > 0) {
        items = items.filter(item => selectedRarities.includes(item.rarity));
    }

    items.sort((a, b) => {
        switch (sortBy) {
            case 'cost-asc':
                return parseCost(a.cost) - parseCost(b.cost);
            case 'cost-desc':
                return parseCost(b.cost) - parseCost(a.cost);
            case 'rarity':
                return rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
            case 'alphabetical':
            default:
                return a.name.localeCompare(b.name);
        }
    });

    return items;
  }, [search, magicItems, sortBy, showPossessed, selectedRarities, possessedItems]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="font-headline flex items-center">
                    <Sparkles className="mr-2" />
                    Database Oggetti
                </CardTitle>
                <CardDescription>Consulta oggetti meravigliosi, pozioni, anelli e altri oggetti comuni e magici. Quelli creati da te possono essere modificati.</CardDescription>
            </div>
             <MagicItemFormDialog
                campaignId={campaignId}
                onSave={onSaveItem}
                trigger={<Button size="icon"><Plus className="h-4 w-4" /><span className="sr-only">Aggiungi Oggetto</span></Button>}
            />
        </div>
        <Input
          placeholder="Cerca un oggetto per nome, rarità, tipo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-4"
        />
        <div className="border-t pt-4 mt-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex-shrink-0">
                            <ArrowUp className="mr-2 h-4 w-4" /> Ordina per: {
                                sortBy === 'alphabetical' ? 'Nome' :
                                sortBy === 'cost-asc' ? 'Costo Crescente' :
                                sortBy === 'cost-desc' ? 'Costo Decrescente' : 'Rarità'
                            }
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
                            <DropdownMenuRadioItem value="alphabetical">Nome (A-Z)</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="rarity">Rarità</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="cost-asc">Costo (Crescente)</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="cost-desc">Costo (Decrescente)</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex-shrink-0">
                            <Filter className="mr-2 h-4 w-4" /> Filtra per Rarità 
                            {selectedRarities.length > 0 && <Badge variant="secondary" className="ml-2">{selectedRarities.length}</Badge>}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuLabel>Seleziona Rarità</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {rarities.map(rarity => (
                            <DropdownMenuCheckboxItem key={rarity} checked={selectedRarities.includes(rarity)} onSelect={(e) => {e.preventDefault(); handleRarityChange(rarity);}}>
                                {rarity}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex items-center space-x-2">
                    <Switch id="show-possessed" checked={showPossessed} onCheckedChange={setShowPossessed} />
                    <Label htmlFor="show-possessed" className="flex items-center gap-2 cursor-pointer">
                        <CheckCircle className="h-4 w-4"/> Mostra solo posseduti
                    </Label>
                </div>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {filteredAndSortedItems.map((item) => (
            <AccordionItem value={item.name} key={item.name}>
              <AccordionPrimitive.Header className="flex items-center">
                <AccordionPrimitive.Trigger className="flex flex-1 items-center justify-between py-4 font-medium text-left transition-all hover:underline [&[data-state=open]>svg]:rotate-180">
                  <div className="flex items-center gap-2 flex-wrap">
                      <span className="break-words pr-2">{item.name}</span>
                      {item.source === 'created' && <Badge variant="secondary"><PlusCircle className="h-3 w-3 mr-1"/>Creato</Badge>}
                      <Badge variant="outline">{item.rarity}</Badge>
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                </AccordionPrimitive.Trigger>
                <div className="flex items-center pl-2 shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Segna come posseduto"
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent accordion from toggling
                            onTogglePossession(item.name);
                        }}
                    >
                        <CheckCircle className={cn('h-5 w-5', possessedItems.includes(item.name) ? 'text-foreground' : 'text-muted-foreground/60 hover:text-foreground/80')} />
                    </Button>
                    <MagicItemFormDialog item={item} campaignId={campaignId} onSave={onSaveItem}
                        trigger={<Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4" /><span className="sr-only">Modifica</span></Button>}
                    />
                </div>
              </AccordionPrimitive.Header>
              <AccordionContent>
                <div className="prose prose-sm prose-invert max-w-none">
                    <DetailItem label="Tipo" value={item.type} />
                    <DetailItem label="Costo" value={item.cost} />
                    {item.attunement && item.attunement !== "No" && <DetailItem label="Sintonia" value={item.attunement} />}
                    <Separator className="my-2" />
                    <div className="whitespace-pre-wrap">{item.description}</div>
                </div>
                {item.source === 'created' && item.id && (
                    <div className="mt-4 flex justify-end">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" />Elimina Oggetto</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Sei sicuro?</AlertDialogTitle><AlertDialogDescription>Questa azione è irreversibile.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => onDeleteItem(item.id!)}>Elimina</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
