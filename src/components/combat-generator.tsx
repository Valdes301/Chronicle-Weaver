'use client';

import { useState } from 'react';
import type { Combat, CombatDetails, CombatUnit, CampaignWithRelations } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sword, Wand2, Save, Trash2, Plus, Skull, Info, Crosshair, Target, Brain, Trophy, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as actions from '@/lib/actions';
import { useRouter } from 'next/navigation';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';

type CombatGeneratorProps = {
  campaign: CampaignWithRelations;
  savedCombats: Combat[];
};

export function CombatGenerator({ campaign, savedCombats }: CombatGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [difficulty, setDifficulty] = useState<string>('Medio');
  const [environment, setEnvironment] = useState<string>('');
  const [units, setUnits] = useState<CombatUnit[]>([
    { quantity: 2, race: 'Goblin', role: 'Arcieri' },
    { quantity: 2, race: 'Goblin', role: 'Spadaccini' }
  ]);

  const [tempCombat, setTempCombat] = useState<CombatDetails | null>(null);

  const { toast } = useToast();
  const router = useRouter();

  const handleAddUnit = () => {
    setUnits([...units, { quantity: 1, race: '', role: '' }]);
  };

  const handleRemoveUnit = (index: number) => {
    const newUnits = units.filter((_, i) => i !== index);
    setUnits(newUnits);
  };

  const updateUnit = (index: number, field: keyof CombatUnit, value: any) => {
    const newUnits = [...units];
    newUnits[index] = { ...newUnits[index], [field]: value };
    setUnits(newUnits);
  };

  const handleGenerate = async () => {
    if (units.some(u => !u.race.trim())) {
      toast({ variant: "destructive", title: "Dati mancanti", description: "Inserisci la razza per tutti i gruppi di nemici." });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await actions.generateCombatAction({
        difficulty: difficulty as any,
        units,
        environment: environment || undefined,
        campaignSummary: campaign.summary || undefined,
      });

      if (!result.success || !result.data) throw new Error(result.error || "Errore IA");

      setTempCombat(result.data);
      toast({ title: "Combattimento Generato!", description: `Preparati per "${result.data.title}".` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!tempCombat) return;

    const result = await actions.saveCombat({
      campaignId: campaign.id,
      name: tempCombat.title,
      difficulty,
      details: JSON.stringify(tempCombat)
    });

    if (result.success) {
      toast({ title: "Incontro Salvato nell'Arena!" });
      setTempCombat(null);
      router.refresh();
    } else {
      toast({ variant: "destructive", title: "Errore", description: result.error || "Impossibile salvare." });
    }
  };

  const handleDelete = async (id: string) => {
    const result = await actions.deleteCombat(id);
    if (result.success) {
      toast({ title: "Incontro rimosso dall'Arena" });
      router.refresh();
    }
  };

  return (
    <div className="space-y-8">
      {/* CONFIGURAZIONE COMBATTIMENTO */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-headline">
            <Sword className="h-6 w-6 text-primary" /> Arena del Destino
          </CardTitle>
          <CardDescription>Configura un incontro tattico definendo nemici, ambientazione e difficoltà.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Difficoltà Incontro</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Facile">Facile</SelectItem>
                  <SelectItem value="Medio">Medio</SelectItem>
                  <SelectItem value="Difficile">Difficile</SelectItem>
                  <SelectItem value="Mortale">Mortale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
                <Label className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" /> Ambientazione (Opzionale)
                </Label>
                <Input 
                    placeholder="es. Grotta umida, Ponte sospeso, Locanda..." 
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Gruppi di Nemici</Label>
                <Button variant="ghost" size="sm" onClick={handleAddUnit} className="h-7 text-[10px] uppercase">
                    <Plus className="mr-1 h-3 w-3" /> Aggiungi Gruppo
                </Button>
            </div>
            
            <div className="grid gap-3">
                {units.map((unit, idx) => (
                    <div key={idx} className="flex flex-wrap sm:flex-nowrap gap-2 items-end sm:items-center bg-background/40 p-3 rounded-lg border border-border/50">
                        <div className="w-14 sm:w-16 shrink-0">
                            <Label className="text-[9px] uppercase font-bold text-muted-foreground mb-1 block sm:hidden">Qtà</Label>
                            <Input 
                                type="number" 
                                value={unit.quantity} 
                                onChange={(e) => updateUnit(idx, 'quantity', parseInt(e.target.value) || 1)} 
                                className="h-8 text-center"
                            />
                        </div>
                        <div className="flex-1 min-w-[100px]">
                            <Label className="text-[9px] uppercase font-bold text-muted-foreground mb-1 block sm:hidden">Razza / Nemico</Label>
                            <Input 
                                placeholder="es. Goblin" 
                                value={unit.race} 
                                onChange={(e) => updateUnit(idx, 'race', e.target.value)}
                                className="h-8"
                            />
                        </div>
                        <div className="flex-1 min-w-[100px]">
                            <Label className="text-[9px] uppercase font-bold text-muted-foreground mb-1 block sm:hidden">Ruolo / Classe</Label>
                            <Input 
                                placeholder="es. Arciere" 
                                value={unit.role} 
                                onChange={(e) => updateUnit(idx, 'role', e.target.value)}
                                className="h-8"
                            />
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveUnit(idx)} className="h-8 w-8 text-destructive/60 hover:text-destructive shrink-0">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t bg-muted/20 p-4">
            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full shadow-lg shadow-primary/20 h-11">
              {isGenerating ? <Wand2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
              Genera Arena Tattica
            </Button>
        </CardFooter>
      </Card>

      {/* ANTEPRIMA COMBATTIMENTO GENERATO */}
      {tempCombat && (
        <Card className="border-accent/40 animate-in fade-in slide-in-from-bottom-4 shadow-xl overflow-hidden">
          <CardHeader className="bg-accent/10 border-b border-accent/20">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <CardTitle className="text-2xl sm:text-3xl font-headline text-accent uppercase tracking-wider">{tempCombat.title}</CardTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline" className="bg-background/50">Difficoltà: {difficulty}</Badge>
                    <Badge variant="secondary" className="flex items-center gap-1">
                        <Trophy className="h-3 w-3" /> {tempCombat.xpTotal} XP Totali
                    </Badge>
                </div>
              </div>
              <Button onClick={handleSave} variant="secondary" className="w-full sm:w-auto">
                <Save className="mr-2 h-4 w-4" /> Salva Incontro
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* SCENARIO */}
            <div className="p-4 rounded-lg bg-muted/30 border">
                <h4 className="font-bold uppercase text-xs tracking-widest text-primary mb-2 flex items-center gap-2">
                    <Crosshair className="h-4 w-4" /> Campo di Battaglia
                </h4>
                <p className="text-sm leading-relaxed italic">"{tempCombat.scenario}"</p>
            </div>

            {/* NEMICI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tempCombat.enemies.map((enemy, i) => (
                    <div key={i} className="p-4 rounded-lg border bg-background/50">
                        <div className="flex justify-between items-start mb-2">
                            <h5 className="font-headline text-lg font-bold text-accent">{enemy.quantity}x {enemy.name}</h5>
                        </div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Statistiche:</p>
                        <p className="text-xs font-mono bg-muted p-1.5 rounded mb-3 break-words">{enemy.stats}</p>
                        <p className="text-xs text-muted-foreground">{enemy.description}</p>
                    </div>
                ))}
            </div>

            <Separator />

            {/* STRATEGIA */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <h4 className="font-bold uppercase text-xs tracking-widest text-primary mb-2 flex items-center gap-2">
                    <Brain className="h-4 w-4" /> Strategia del Master
                </h4>
                <p className="text-sm leading-relaxed">{tempCombat.strategy}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ARCHIVIO ARENA */}
      {savedCombats.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-headline text-3xl flex items-center gap-2 border-b pb-2">
            <Skull className="h-6 w-6 text-primary" /> Arena della Campagna
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {savedCombats.map((c) => {
              const details = JSON.parse(c.details) as CombatDetails;
              return (
                <Card key={c.id} className="group hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="font-headline text-xl text-primary leading-tight line-clamp-1">{c.name}</CardTitle>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="outline" className="text-[9px] px-1 h-4">{c.difficulty}</Badge>
                        <Badge variant="secondary" className="text-[9px] px-1 h-4">{details.xpTotal} XP</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                        {details.enemies.slice(0, 3).map((e, idx) => (
                            <div key={idx} className="text-xs flex items-center gap-2">
                                <Target className="h-3 w-3 text-accent shrink-0" /> <span className="truncate">{e.quantity}x {e.name}</span>
                            </div>
                        ))}
                        {details.enemies.length > 3 && <p className="text-[10px] text-muted-foreground italic">+ altri gruppi...</p>}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 justify-end">
                      <Button variant="ghost" size="sm" className="text-[10px] h-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setTempCombat(details)}>
                          <Info className="mr-1 h-3 w-3" /> Vedi Dettagli Arena
                      </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
