'use client';

import { useState, useMemo } from 'react';
import type { CampaignWithRelations, TreasureItem, MagicItem } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Wand2, Trash2, Coins, Gem, Skull, Loader2, Printer, Pencil, BookPlus, Trophy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as actions from '@/lib/actions';
import { useRouter } from 'next/navigation';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ExperimentalCardGenerator } from './experimental-card-generator';
import { cn } from '@/lib/utils';

type TreasureGeneratorProps = {
  campaign: CampaignWithRelations;
};

const LOOT_TYPES = [
    { id: 'Monete', label: 'Monete', icon: Coins },
    { id: 'Gioielli', label: 'Gioielli', icon: Gem },
    { id: 'Oggetti Magici', label: 'Oggetti Magici', icon: Sparkles },
    { id: 'Maledetti', label: 'Maledetti', icon: Skull },
];

export function TreasureGenerator({ campaign }: TreasureGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [location, setLocation] = useState('Forziere in un Dungeon');
  const [valueType, setValueType] = useState<'Random (Scarso)' | 'Random (Medio)' | 'Random (Ricco)' | 'Specifico'>('Random (Medio)');
  const [specificGold, setSpecificGold] = useState<number>(500);
  const [allowedTypes, setAllowedTypes] = useState<string[]>(['Monete', 'Gioielli', 'Oggetti Magici']);
  const [quantity, setQuantity] = useState(3);

  const [tempLoot, setTempLoot] = useState<{ title: string; items: TreasureItem[] } | null>(null);
  const [editingIdx, setEditingIndex] = useState<number | null>(null);
  
  const { toast } = useToast();
  const router = useRouter();

  const handleToggleType = (typeId: string) => {
    setAllowedTypes(prev => prev.includes(typeId) ? prev.filter(t => t !== typeId) : [...prev, typeId]);
  };

  const handleGenerate = async () => {
    if (allowedTypes.length === 0) {
        toast({ variant: 'destructive', title: "Seleziona almeno un tipo di bottino" });
        return;
    }

    setIsGenerating(true);
    setEditingIndex(null);
    try {
      const result = await actions.generateTreasureAction({
        location,
        valueType,
        specificGold: valueType === 'Specifico' ? specificGold : undefined,
        allowedTypes,
        quantity,
        campaignSummary: campaign.summary || undefined,
      });

      if (!result.success || !result.data) throw new Error(result.error || "Errore IA");

      setTempLoot(result.data);
      toast({ title: "Tesoro Generato!", description: `Ritrovamento: ${result.data.title}` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateItem = (idx: number, updates: Partial<TreasureItem>) => {
    if (!tempLoot) return;
    const newItems = [...tempLoot.items];
    newItems[idx] = { ...newItems[idx], ...updates };
    setTempLoot({ ...tempLoot, items: newItems });
  };

  const handleSaveToManual = async (item: TreasureItem) => {
    const result = await actions.saveMagicItem({
        name: item.name,
        type: item.type,
        rarity: item.rarity,
        description: item.description,
        cost: item.cost,
        techType: item.techType,
        campaignId: campaign.id
    });

    if (result.success) {
        toast({ title: "Oggetto aggiunto al manuale!" });
        router.refresh();
    }
  };

  const handleSaveToRewards = async (item: TreasureItem) => {
    const result = await actions.quickSaveRewardAction(campaign.id, item.name, item.description);
    if (result.success) {
        toast({ title: "Aggiunto alle Ricompense Speciali!" });
        router.refresh();
    }
  };

  // Prepara i dati per il generatore di carte
  const itemsForGenerator = useMemo(() => {
    if (!tempLoot) return [];
    return tempLoot.items.map(item => ({
        ...item,
        // Map standard fields for generator
        damage: item.techType === 'reward' ? null : item.cost,
        source: 'created' as const
    })) as any[];
  }, [tempLoot]);

  const initialSelection = useMemo(() => {
    if (!tempLoot) return [];
    return tempLoot.items.map(item => ({
        name: item.name,
        type: 'item' as const
    }));
  }, [tempLoot]);

  return (
    <div className="space-y-8">
      {/* CONFIGURAZIONE */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-headline">
            <Sparkles className="h-6 w-6 text-primary" /> Generatore di Tesori
          </CardTitle>
          <CardDescription>Crea bottini personalizzati o casuali basandoti sul luogo del ritrovamento.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
                <Label>Luogo / Contesto</Label>
                <Input 
                    value={location} 
                    onChange={(e) => setLocation(e.target.value)} 
                    placeholder="es. Corpo del Boss, Scomparto segreto..."
                />
            </div>
            <div className="space-y-2">
              <Label>Valore del Tesoro</Label>
              <Select value={valueType} onValueChange={(v: any) => setValueType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Random (Scarso)">Random (Scarso / Liv. 1-4)</SelectItem>
                  <SelectItem value="Random (Medio)">Random (Medio / Liv. 5-10)</SelectItem>
                  <SelectItem value="Random (Ricco)">Random (Ricco / Liv. 11-16)</SelectItem>
                  <SelectItem value="Specifico">Importo Specifico (mo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {valueType === 'Specifico' && (
                <div className="space-y-2 animate-in slide-in-from-top-1">
                    <Label>Oro Totale (mo)</Label>
                    <Input type="number" value={specificGold} onChange={(e) => setSpecificGold(parseInt(e.target.value) || 0)} />
                </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Cosa può contenere?</Label>
                <div className="grid grid-cols-2 gap-2">
                    {LOOT_TYPES.map(type => (
                        <div 
                            key={type.id} 
                            onClick={() => handleToggleType(type.id)}
                            className={cn(
                                "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all",
                                allowedTypes.includes(type.id) ? "bg-primary/20 border-primary text-primary-foreground" : "bg-muted/20 border-border opacity-60"
                            )}
                        >
                            <type.icon className="h-4 w-4" />
                            <span className="text-xs font-bold">{type.label}</span>
                            {allowedTypes.includes(type.id) && <Check className="ml-auto h-3 w-3" />}
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between">
                    <Label>Quantità di oggetti</Label>
                    <span className="text-xs font-bold text-primary">{quantity}</span>
                </div>
                <input 
                    type="range" min="1" max="10" 
                    value={quantity} 
                    onChange={(e) => setQuantity(parseInt(e.target.value))} 
                    className="w-full accent-primary"
                />
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/20 border-t p-4">
            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full h-11 shadow-lg shadow-primary/20">
                {isGenerating ? <Loader2 className="mr-2 animate-spin h-5 w-5" /> : <Wand2 className="mr-2 h-5 w-5" />}
                Genera Tesoro IA
            </Button>
        </CardFooter>
      </Card>

      {/* RISULTATO E EDITING */}
      {tempLoot && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex flex-col sm:flex-row justify-between items-baseline border-b pb-2">
                  <h3 className="font-headline text-3xl text-accent uppercase tracking-wider">{tempLoot.title}</h3>
                  <Badge variant="outline" className="text-muted-foreground uppercase text-[10px]">{location}</Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                  {tempLoot.items.map((item, idx) => (
                      <Card key={idx} className={cn("relative group overflow-hidden transition-all", editingIdx === idx && "border-primary")}>
                          <CardHeader className="pb-3">
                              <div className="flex flex-col gap-2">
                                  {/* Riga 1: Nome a tutta larghezza */}
                                  <div className="w-full">
                                      {editingIdx === idx ? (
                                          <Input 
                                              value={item.name} 
                                              onChange={(e) => handleUpdateItem(idx, { name: e.target.value })} 
                                              className="h-9 font-bold w-full"
                                          />
                                      ) : (
                                          <CardTitle className="text-xl font-headline leading-tight">
                                              {item.name}
                                          </CardTitle>
                                      )}
                                  </div>

                                  {/* Riga 2: Icone e Badge */}
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                          {item.isCursed && <Skull className="h-5 w-5 text-destructive shrink-0" />}
                                          <div className="flex gap-1">
                                              <Badge variant="secondary" className="text-[9px] h-4 leading-none uppercase">{item.type}</Badge>
                                              <Badge variant="outline" className="text-[9px] h-4 leading-none">{item.rarity}</Badge>
                                          </div>
                                      </div>
                                      
                                      <div className="flex gap-1 ml-auto">
                                          {editingIdx === idx ? (
                                              <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500" onClick={() => setEditingIndex(null)}>
                                                  <Check className="h-4 w-4"/>
                                              </Button>
                                          ) : (
                                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground sm:opacity-0 sm:group-hover:opacity-100" onClick={() => setEditingIndex(idx)}>
                                                  <Pencil className="h-4 w-4"/>
                                              </Button>
                                          )}
                                          <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              className="h-8 w-8 text-destructive/60 sm:opacity-0 sm:group-hover:opacity-100" 
                                              onClick={() => setTempLoot({...tempLoot, items: tempLoot.items.filter((_, i) => i !== idx)})}
                                          >
                                              <Trash2 className="h-4 w-4"/>
                                          </Button>
                                      </div>
                                  </div>
                              </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                              {editingIdx === idx ? (
                                  <div className="space-y-3 animate-in fade-in">
                                      <div className="grid grid-cols-2 gap-2">
                                          <div className="space-y-1">
                                              <Label className="text-[9px] uppercase font-bold text-muted-foreground">Valore</Label>
                                              <Input value={item.cost} onChange={(e) => handleUpdateItem(idx, { cost: e.target.value })} className="h-7 text-xs" />
                                          </div>
                                          <div className="space-y-1">
                                              <Label className="text-[9px] uppercase font-bold text-muted-foreground">Rarità</Label>
                                              <Input value={item.rarity} onChange={(e) => handleUpdateItem(idx, { rarity: e.target.value })} className="h-7 text-xs" />
                                          </div>
                                      </div>
                                      <div className="space-y-1">
                                          <Label className="text-[9px] uppercase font-bold text-muted-foreground">Descrizione</Label>
                                          <Textarea value={item.description} onChange={(e) => handleUpdateItem(idx, { description: e.target.value })} className="text-xs min-h-[80px]" />
                                      </div>
                                  </div>
                              ) : (
                                  <>
                                      <div className="flex justify-between items-center text-xs bg-muted/30 p-2 rounded">
                                          <span className="font-bold uppercase opacity-60">Valore Stimato:</span>
                                          <span className="font-mono font-bold text-primary">{item.cost}</span>
                                      </div>
                                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap italic">"{item.description}"</p>
                                  </>
                              )}
                          </CardContent>
                          <CardFooter className="pt-0 flex gap-2">
                              {item.type.includes('Magico') || item.type.includes('Arma') || item.type.includes('Mondano') ? (
                                  <Button variant="ghost" size="sm" className="h-7 text-[9px] uppercase w-full bg-primary/5 hover:bg-primary/20" onClick={() => handleSaveToManual(item)}>
                                      <BookPlus className="mr-1 h-3 w-3" /> Aggiungi al Manuale
                                  </Button>
                              ) : (
                                  <Button variant="ghost" size="sm" className="h-7 text-[9px] uppercase w-full bg-accent/5 hover:bg-accent/20" onClick={() => handleSaveToRewards(item)}>
                                      <Trophy className="mr-1 h-3 w-3" /> Aggiungi alle Ricompense
                                  </Button>
                              )}
                          </CardFooter>
                      </Card>
                  ))}
              </div>

              <Separator />

              {/* STAMPA CARTE */}
              <div className="space-y-4">
                  <div className="flex items-center gap-2">
                      <Printer className="h-5 w-5 text-muted-foreground" />
                      <h4 className="font-bold uppercase text-xs tracking-widest text-muted-foreground">Genera Handout Fisici</h4>
                  </div>
                  <div className="bg-background border rounded-xl p-4 sm:p-8">
                      <ExperimentalCardGenerator 
                          allItems={itemsForGenerator} 
                          dbSpells={[]} 
                          initialSelection={initialSelection}
                      />
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
