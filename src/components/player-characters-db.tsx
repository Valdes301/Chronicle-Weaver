
'use client';

import { useState, useEffect, useId } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import * as actions from '@/lib/actions';
import type { PlayerCharacter, Skill } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Plus, Trash2, Pencil, Heart, Shield } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

// Schema for the form
const characterSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Il nome è obbligatorio."),
  race: z.string().optional().nullable(),
  class: z.string().optional().nullable(),
  archetype: z.string().optional().nullable(),
  level: z.coerce.number().min(1, "Il livello deve essere almeno 1.").optional().nullable(),
  hitPoints: z.coerce.number().optional().nullable(),
  armorClass: z.coerce.number().optional().nullable(),
  strength: z.coerce.number().min(1).max(30).optional().nullable(),
  dexterity: z.coerce.number().min(1).max(30).optional().nullable(),
  constitution: z.coerce.number().min(1).max(30).optional().nullable(),
  intelligence: z.coerce.number().min(1).max(30).optional().nullable(),
  wisdom: z.coerce.number().min(1).max(30).optional().nullable(),
  charisma: z.coerce.number().min(1).max(30).optional().nullable(),
  background: z.string().optional().nullable(),
  skills: z.array(z.string()).optional(),
  spells: z.string().optional().nullable(),
  pact: z.string().optional().nullable(),
  school: z.string().optional().nullable(),
  domain: z.string().optional().nullable(),
  traits: z.string().optional().nullable(),
  ideals: z.string().optional().nullable(),
  bonds: z.string().optional().nullable(),
  flaws: z.string().optional().nullable(),
});

type CharacterFormData = z.infer<typeof characterSchema>;

const getModifier = (score: number | null | undefined) => {
    if (!score) return 0;
    return Math.floor((score - 10) / 2);
}
const formatModifier = (mod: number) => mod >= 0 ? `+${mod}` : mod.toString();

const CharacterFormDialog = ({ character, onSave, trigger, campaignId, skills: allSkills }: { character?: PlayerCharacter, onSave: (data: CharacterFormData & { campaignId: string }) => void, trigger: React.ReactNode, campaignId: string, skills: Skill[] }) => {
    const [isOpen, setIsOpen] = useState(false);
    const formId = useId();
    
    const statTranslations: Record<string, string> = {
        strength: 'Forza',
        dexterity: 'Destrezza',
        constitution: 'Costituzione',
        intelligence: 'Intelligenza',
        wisdom: 'Saggezza',
        charisma: 'Carisma',
    };
    
    const form = useForm<CharacterFormData>({
        resolver: zodResolver(characterSchema),
        defaultValues: {
            id: character?.id,
            name: character?.name ?? '',
            race: character?.race ?? '',
            class: character?.class ?? '',
            archetype: character?.archetype ?? '',
            level: character?.level ?? 1,
            hitPoints: character?.hitPoints ?? 10,
            armorClass: character?.armorClass ?? 10,
            strength: character?.strength ?? 10,
            dexterity: character?.dexterity ?? 10,
            constitution: character?.constitution ?? 10,
            intelligence: character?.intelligence ?? 10,
            wisdom: character?.wisdom ?? 10,
            charisma: character?.charisma ?? 10,
            background: character?.background ?? '',
            skills: character?.skills ? JSON.parse(character.skills) : [],
            spells: character?.spells ?? '',
            pact: character?.pact ?? '',
            school: character?.school ?? '',
            domain: character?.domain ?? '',
            traits: character?.traits ?? '',
            ideals: character?.ideals ?? '',
            bonds: character?.bonds ?? '',
            flaws: character?.flaws ?? '',
        },
    });

    const watchedStats = form.watch(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']);
    const watchedClass = form.watch('class');

    useEffect(() => {
        if(isOpen) {
            form.reset({
                id: character?.id,
                name: character?.name ?? '',
                race: character?.race ?? '',
                class: character?.class ?? '',
                archetype: character?.archetype ?? '',
                level: character?.level ?? 1,
                hitPoints: character?.hitPoints ?? 10,
                armorClass: character?.armorClass ?? 10,
                strength: character?.strength ?? 10,
                dexterity: character?.dexterity ?? 10,
                constitution: character?.constitution ?? 10,
                intelligence: character?.intelligence ?? 10,
                wisdom: character?.wisdom ?? 10,
                charisma: character?.charisma ?? 10,
                background: character?.background ?? '',
                skills: character?.skills ? JSON.parse(character.skills) : [],
                spells: character?.spells ?? '',
                pact: character?.pact ?? '',
                school: character?.school ?? '',
                domain: character?.domain ?? '',
                traits: character?.traits ?? '',
                ideals: character?.ideals ?? '',
                bonds: character?.bonds ?? '',
                flaws: character?.flaws ?? '',
            });
        }
    }, [isOpen, character, form]);

    const handleSubmit = async (values: CharacterFormData) => {
        await onSave({
            ...values,
            campaignId,
        });
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-4xl grid grid-rows-[auto_1fr_auto] max-h-[90vh] p-0">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle className="font-headline text-2xl">{character ? 'Modifica Personaggio' : 'Nuovo Personaggio'}</DialogTitle>
                    <DialogDescription>
                        Inserisci i dettagli del personaggio. Questi dati aiuteranno l'IA a personalizzare la storia.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="px-6">
                    <Form {...form}>
                        <form id={formId} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem><FormLabel>Nome</FormLabel><FormControl><Input placeholder="Gimli" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="race" render={({ field }) => (
                                    <FormItem><FormLabel>Razza</FormLabel><FormControl><Input placeholder="Nano" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                )} />
                                    <FormField control={form.control} name="level" render={({ field }) => (
                                    <FormItem><FormLabel>Livello</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField control={form.control} name="class" render={({ field }) => (
                                    <FormItem><FormLabel>Classe</FormLabel><FormControl><Input placeholder="Guerriero" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="archetype" render={({ field }) => (
                                    <FormItem><FormLabel>Sottoclasse/Archetipo</FormLabel><FormControl><Input placeholder="Campione" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                            
                            {watchedClass?.toLowerCase() === 'chierico' && (
                                <FormField control={form.control} name="domain" render={({ field }) => (
                                    <FormItem><FormLabel>Dominio Divino</FormLabel><FormControl><Input placeholder="Dominio della Vita" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                )} />
                            )}
                            {watchedClass?.toLowerCase() === 'mago' && (
                                <FormField control={form.control} name="school" render={({ field }) => (
                                    <FormItem><FormLabel>Scuola Arcana</FormLabel><FormControl><Input placeholder="Scuola di Invocazione" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                )} />
                            )}
                            {watchedClass?.toLowerCase() === 'warlock' && (
                                <FormField control={form.control} name="pact" render={({ field }) => (
                                    <FormItem><FormLabel>Patto Ultraterreno</FormLabel><FormControl><Input placeholder="Il Grande Antico" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                )} />
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="hitPoints" render={({ field }) => (
                                    <FormItem><FormLabel>Punti Ferita Massimi</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="armorClass" render={({ field }) => (
                                    <FormItem><FormLabel>Classe Armatura</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                            
                            <Card>
                                <CardHeader className="p-4"><CardTitle className="text-lg">Caratteristiche</CardTitle></CardHeader>
                                <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {(Object.keys(statTranslations) as Array<keyof typeof statTranslations>).map((stat, i) => (
                                        <FormField key={stat} control={form.control} name={stat as keyof CharacterFormData} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{statTranslations[stat]}</FormLabel>
                                                <div className="flex items-center gap-2">
                                                    <FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} /></FormControl>
                                                    <Badge variant="outline" className="w-12 justify-center text-lg">{formatModifier(getModifier(watchedStats[i]))}</Badge>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    ))}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="p-4"><CardTitle className="text-lg">Competenze nelle Abilità</CardTitle></CardHeader>
                                <CardContent className="p-4">
                                    <FormField control={form.control} name="skills" render={() => (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {allSkills.map((skill) => (
                                                <FormField key={skill.name} control={form.control} name="skills" render={({ field }) => (
                                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                        <FormControl>
                                                            <Checkbox 
                                                                checked={field.value?.includes(skill.name)}
                                                                onCheckedChange={(checked) => {
                                                                    return checked
                                                                        ? field.onChange([...(field.value ?? []), skill.name])
                                                                        : field.onChange(field.value?.filter(v => v !== skill.name))
                                                                }}
                                                            />
                                                        </FormControl>
                                                        <FormLabel className="font-normal">{skill.name} <span className="text-muted-foreground text-xs">({skill.ability?.substring(0,3)})</span></FormLabel>
                                                        </FormItem>
                                                )} />
                                            ))}
                                        </div>
                                    )} />
                                </CardContent>
                            </Card>
                            
                            <FormField control={form.control} name="spells" render={({ field }) => (
                                <FormItem><FormLabel>Magie Conosciute</FormLabel><FormControl><Textarea placeholder="Elenca le magie conosciute, separate da una virgola..." className="min-h-[100px]" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                            )} />
                            
                            <Card>
                                <CardHeader className="p-4"><CardTitle className="text-lg">Personalità</CardTitle></CardHeader>
                                <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="traits" render={({ field }) => (
                                        <FormItem><FormLabel>Tratti di Personalità</FormLabel><FormControl><Textarea placeholder="Due tratti di personalità..." className="min-h-[100px]" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="ideals" render={({ field }) => (
                                        <FormItem><FormLabel>Ideali</FormLabel><FormControl><Textarea placeholder="Cosa spinge il personaggio..." className="min-h-[100px]" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="bonds" render={({ field }) => (
                                        <FormItem><FormLabel>Legami</FormLabel><FormControl><Textarea placeholder="Persone, luoghi o eventi importanti..." className="min-h-[100px]" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="flaws" render={({ field }) => (
                                        <FormItem><FormLabel>Difetti</FormLabel><FormControl><Textarea placeholder="Una debolezza, una paura, un vizio..." className="min-h-[100px]" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </CardContent>
                            </Card>

                            <FormField control={form.control} name="background" render={({ field }) => (
                                <FormItem><FormLabel>Background e Note</FormLabel><FormControl><Textarea placeholder="Descrivi il passato del personaggio, i suoi obiettivi, i suoi tratti distintivi..." className="min-h-[120px]" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </form>
                    </Form>
                </ScrollArea>

                <DialogFooter className="p-6 pt-4 border-t">
                    <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Annulla</Button>
                    <Button type="submit" form={formId} disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? 'Salvataggio...' : 'Salva Personaggio'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

interface PlayerCharactersDbProps {
    campaignId: string;
    initialCharacters: PlayerCharacter[];
    oldData: string | null;
    skills: Skill[];
    onSave: (character: any) => void;
    onDelete: (id: string) => void;
}

export function PlayerCharactersDb({ campaignId, initialCharacters, oldData, skills, onSave, onDelete }: PlayerCharactersDbProps) {
    const { toast } = useToast();

    useEffect(() => {
        const migrate = async () => {
            if (oldData && initialCharacters.length === 0) {
                toast({ title: 'Migrazione Dati Personaggi', description: 'Sto aggiornando il formato dei dati dei personaggi. Attendi un momento...' });
                const result = await actions.migrateOldCharacters(campaignId, oldData);
                if (result.success) {
                    toast({ title: 'Migrazione Completata!', description: 'I tuoi personaggi sono stati aggiornati al nuovo formato.' });
                } else {
                    toast({ variant: 'destructive', title: 'Errore di Migrazione', description: result.error });
                }
            }
        };
        migrate();
    }, [campaignId, oldData, initialCharacters.length, toast]);

    return (
    <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
            <div>
                <h2 className="font-headline text-3xl">Personaggi Giocanti</h2>
                <p className="text-muted-foreground">
                  Gestisci le schede dei tuoi personaggi. L'IA terrà conto di queste informazioni quando genererà le prossime scene.
                </p>
            </div>
             <CharacterFormDialog onSave={onSave} campaignId={campaignId} skills={skills} trigger={
                <Button size="icon" className="flex-shrink-0"><Plus className="h-4 w-4" /><span className="sr-only">Aggiungi Personaggio</span></Button>
            } />
        </div>

        {initialCharacters.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {initialCharacters.map(char => (
                    <Card key={char.id} className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex justify-between items-start">
                                <span>{char.name}</span>
                                <div className="flex items-center gap-1">
                                    <CharacterFormDialog character={char} onSave={onSave} campaignId={campaignId} skills={skills} trigger={
                                        <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                                    }/>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive/80 hover:text-destructive h-8 w-8">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Sei sicuro di voler eliminare {char.name}?</AlertDialogTitle>
                                                <AlertDialogDescription>Questa azione è irreversibile.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Annulla</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => onDelete(char.id)}>Elimina</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardTitle>
                            <CardDescription>{char.race} {char.class} {char.archetype && `(${char.archetype})`} - Liv. {char.level || 1}</CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground flex-grow">
                           <p className="line-clamp-2">{char.background || 'Nessun background inserito.'}</p>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-4 text-xs">
                           <div className="flex items-center gap-1.5" title="Punti Ferita">
                             <Heart className="h-4 w-4 text-red-400" />
                             <span className="font-bold">{char.hitPoints || 'N/D'}</span>
                           </div>
                           <div className="flex items-center gap-1.5" title="Classe Armatura">
                             <Shield className="h-4 w-4 text-sky-400" />
                             <span className="font-bold">{char.armorClass || 'N/D'}</span>
                           </div>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        ) : (
             !oldData && (
                <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                    <Users className="mx-auto h-12 w-12" />
                    <p className="mt-4 font-semibold">Nessun personaggio ancora creato.</p>
                    <p className="text-sm">Aggiungi il tuo primo personaggio per iniziare.</p>
                </div>
             )
        )}
    </div>
  );
}
