
'use client';

import { useState, useMemo, useEffect, useId } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem } from '@/components/ui/accordion';
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Badge } from '@/components/ui/badge';
import { Skull, PlusCircle, Plus, Pencil, Trash2, ChevronDown, CheckCircle } from 'lucide-react';
import type { Monster } from '@/lib/types';
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

const DetailItem = ({ label, value }: { label: string, value?: React.ReactNode }) => {
    if (!value) return null;
    return <p><strong>{label}:</strong> {String(value)}</p>;
}

const monsterSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Il nome è obbligatorio."),
  type: z.string().optional(),
  armorClass: z.string().optional(),
  hitPoints: z.string().optional(),
  challenge: z.string().optional(),
  description: z.string().optional(),
});

type MonsterFormData = z.infer<typeof monsterSchema>;

function MonsterFormDialog({ monster, campaignId, trigger, onSave }: { monster?: Partial<Monster>, campaignId: string, trigger: React.ReactNode, onSave: (data: MonsterFormData & { campaignId: string }) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const formId = useId();

    const form = useForm<MonsterFormData>({
        resolver: zodResolver(monsterSchema),
        defaultValues: {
            id: monster?.id,
            name: monster?.name ?? '',
            type: monster?.type ?? '',
            armorClass: monster?.armorClass ?? '',
            hitPoints: monster?.hitPoints ?? '',
            challenge: monster?.challenge ?? '',
            description: monster?.description ?? '',
        },
    });
     
    useEffect(() => {
        if(isOpen) {
            form.reset({
                id: monster?.id,
                name: monster?.name ?? '',
                type: monster?.type ?? '',
                armorClass: monster?.armorClass ?? '',
                hitPoints: monster?.hitPoints ?? '',
                challenge: monster?.challenge ?? '',
                description: monster?.description ?? '',
            });
        }
    }, [isOpen, monster, form]);

    const handleSubmit = async (values: MonsterFormData) => {
        await onSave({ ...values, campaignId });
        setIsOpen(false);
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="grid grid-rows-[auto_1fr_auto] max-h-[90vh] p-0">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>{monster?.id ? 'Modifica Mostro' : 'Nuovo Mostro'}</DialogTitle>
                    <DialogDescription>Inserisci le statistiche per il tuo mostro personalizzato.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="px-6 border-y">
                <Form {...form}>
                    <form id={formId} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
                        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Tipo</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="armorClass" render={({ field }) => (<FormItem><FormLabel>Classe Armatura</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="hitPoints" render={({ field }) => (<FormItem><FormLabel>Punti Ferita</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="challenge" render={({ field }) => (<FormItem><FormLabel>Grado di Sfida (GS)</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Descrizione</FormLabel><FormControl><Textarea className="min-h-[120px]" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
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

interface MonstersDbProps {
    monsters: Monster[];
    campaignId: string;
    possessedItems: string[];
    onSave: (monster: Partial<Monster> & { campaignId: string }) => void;
    onDelete: (id: string) => void;
    onTogglePossession: (itemName: string) => void;
}

export function MonstersDb({ monsters, campaignId, possessedItems, onSave, onDelete, onTogglePossession }: MonstersDbProps) {
  const [monsterSearch, setMonsterSearch] = useState('');

  const filteredMonsters = useMemo(() => {
    if (!monsterSearch) return monsters;
    const lowerCaseSearch = monsterSearch.toLowerCase();
    return monsters.filter(monster =>
      monster.name.toLowerCase().includes(lowerCaseSearch) ||
      (monster.type?.toLowerCase() ?? '').includes(lowerCaseSearch) ||
      (monster.challenge?.toLowerCase() ?? '').includes(lowerCaseSearch)
    );
  }, [monsterSearch, monsters]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="font-headline flex items-center">
                <Skull className="mr-2" />
                Bestiario
                </CardTitle>
                <CardDescription>Consulta le statistiche dei mostri, inclusi quelli creati da te che possono essere modificati.</CardDescription>
            </div>
            <MonsterFormDialog
                campaignId={campaignId}
                onSave={onSave}
                trigger={<Button size="icon"><Plus className="h-4 w-4" /><span className="sr-only">Aggiungi Mostro</span></Button>}
            />
        </div>
        <Input
          placeholder="Cerca un mostro per nome, tipo o grado di sfida..."
          value={monsterSearch}
          onChange={(e) => setMonsterSearch(e.target.value)}
          className="mt-4"
        />
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {filteredMonsters.map((monster) => (
            <AccordionItem value={monster.name} key={monster.name}>
              <AccordionPrimitive.Header className="flex items-center">
                <AccordionPrimitive.Trigger className="flex flex-1 items-center justify-between py-4 font-medium text-left transition-all hover:underline [&[data-state=open]>svg]:rotate-180">
                  <div className="flex items-center gap-2 flex-wrap">
                      <span className="break-words pr-2">{monster.name}</span>
                      {monster.source === 'created' && <Badge variant="secondary"><PlusCircle className="h-3 w-3 mr-1"/>Creato</Badge>}
                      {monster.challenge && <Badge variant="outline">GS {monster.challenge}</Badge>}
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                </AccordionPrimitive.Trigger>
                <div className="flex items-center pl-2 shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Segna come incontrato"
                        onClick={(e) => {
                            e.stopPropagation();
                            onTogglePossession(monster.name);
                        }}
                    >
                        <CheckCircle className={cn('h-5 w-5', possessedItems.includes(monster.name) ? 'text-foreground' : 'text-muted-foreground/60 hover:text-foreground/80')} />
                    </Button>
                    <MonsterFormDialog monster={monster} campaignId={campaignId} onSave={onSave}
                        trigger={<Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4" /><span className="sr-only">Modifica</span></Button>}
                    />
                </div>
              </AccordionPrimitive.Header>
              <AccordionContent>
                <div className="prose prose-sm prose-invert max-w-none">
                    <DetailItem label="Tipo" value={monster.type} />
                    <DetailItem label="Classe Armatura" value={monster.armorClass} />
                    <DetailItem label="Punti Ferita" value={monster.hitPoints} />
                    <Separator className="my-2"/>
                    <div className="whitespace-pre-wrap">{monster.description}</div>
                </div>
                {monster.source === 'created' && monster.id && (
                    <div className="mt-4 flex justify-end">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" />Elimina Mostro</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Sei sicuro?</AlertDialogTitle><AlertDialogDescription>Questa azione è irreversibile.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => onDelete(monster.id!)}>Elimina</AlertDialogAction>
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
