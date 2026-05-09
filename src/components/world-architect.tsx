'use client';

import { useState } from 'react';
import type { LocationDetails, WorldLocation, CampaignWithRelations } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MapPin, Wand2, Save, Trash2, Eye, Ear, Wind, Sparkles, Ghost, Info, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as actions from '@/lib/actions';
import { useRouter } from 'next/navigation';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

type WorldArchitectProps = {
  campaign: CampaignWithRelations;
  savedLocations: WorldLocation[];
};

export function WorldArchitect({ campaign, savedLocations }: WorldArchitectProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [scale, setScale] = useState<string>('Medio (Quartiere, Piazza, Taverna)');
  const [style, setStyle] = useState<string>('Decadente');
  const [atmosphere, setAtmosphere] = useState<string>('Sinistro');
  const [population, setPopulation] = useState<string>('Deserto');

  const [tempLocation, setTempLocation] = useState<LocationDetails | null>(null);

  const { toast } = useToast();
  const router = useRouter();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await actions.generateLocationAction({
        scale: scale as any,
        style: style as any,
        atmosphere: atmosphere as any,
        population: population as any,
        campaignSummary: campaign.summary || undefined,
      });

      if (!result.success || !result.data) throw new Error(result.error || "Errore IA");

      setTempLocation(result.data);
      toast({ title: "Luogo Creato!", description: `L'IA ha immaginato "${result.data.title}".` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!tempLocation) return;

    const result = await actions.saveWorldLocation({
      campaignId: campaign.id,
      name: tempLocation.title,
      scale,
      style,
      atmosphere,
      details: JSON.stringify(tempLocation)
    });

    if (result.success) {
      toast({ title: "Luogo Salvato nell'Atlante!" });
      setTempLocation(null);
      router.refresh();
    } else {
      toast({ variant: "destructive", title: "Errore", description: result.error || "Impossibile salvare." });
    }
  };

  const handleDelete = async (id: string) => {
    const result = await actions.deleteWorldLocation(id);
    if (result.success) {
      toast({ title: "Luogo rimosso dall'Atlante" });
      router.refresh();
    }
  };

  return (
    <div className="space-y-8">
      {/* CONFIGURAZIONE GENERATORE */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-headline">
            <MapPin className="h-6 w-6 text-primary" /> Architetto di Mondi
          </CardTitle>
          <CardDescription>Genera velocemente luoghi dettagliati con descrizioni sensoriali e segreti per il Master.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Scala del Luogo</Label>
              <Select value={scale} onValueChange={setScale}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Micro (Stanza, Vicolo)">Micro (Stanza, Vicolo)</SelectItem>
                  <SelectItem value="Medio (Quartiere, Piazza, Taverna)">Medio (Quartiere, Piazza, Taverna)</SelectItem>
                  <SelectItem value="Macro (Villaggio, Dungeon, Foresta)">Macro (Villaggio, Dungeon, Foresta)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Stile e Condizione</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ricco">Ricco / Sfarzoso</SelectItem>
                  <SelectItem value="Povero">Povero / Semplice</SelectItem>
                  <SelectItem value="Decadente">Decadente</SelectItem>
                  <SelectItem value="Diroccato">Diroccato / In rovina</SelectItem>
                  <SelectItem value="Incontaminato">Incontaminato / Nuovo</SelectItem>
                  <SelectItem value="In costruzione">In costruzione</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Atmosfera</Label>
              <Select value={atmosphere} onValueChange={setAtmosphere}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sinistro">Sinistro / Cupo</SelectItem>
                  <SelectItem value="Accogliente">Accogliente / Caldo</SelectItem>
                  <SelectItem value="Caotico">Caotico / Rumoroso</SelectItem>
                  <SelectItem value="Silenzioso">Silenzioso / Tranquillo</SelectItem>
                  <SelectItem value="Magico">Magico / Arcano</SelectItem>
                  <SelectItem value="Misterioso">Misterioso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Popolazione</Label>
              <Select value={population} onValueChange={setPopulation}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Affollato">Affollato</SelectItem>
                  <SelectItem value="Deserto">Deserto / Abbandonato</SelectItem>
                  <SelectItem value="Abitato da mostri">Abitato da mostri</SelectItem>
                  <SelectItem value="Solo PNG ostili">Solo PNG ostili</SelectItem>
                  <SelectItem value="Tranquillo">Tranquillo / Civile</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleGenerate} disabled={isGenerating} className="w-full h-12 text-lg shadow-lg shadow-primary/20">
            {isGenerating ? <Wand2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
            {isGenerating ? "L'IA sta plasmando il mondo..." : "Genera Luogo IA"}
          </Button>
        </CardFooter>
      </Card>

      {/* ANTEPRIMA LUOGO GENERATO */}
      {tempLocation && (
        <Card className="border-accent/40 animate-in fade-in slide-in-from-bottom-4 shadow-xl">
          <CardHeader className="bg-accent/10">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl font-headline text-accent uppercase tracking-wider">{tempLocation.title}</CardTitle>
                <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{scale}</Badge>
                    <Badge variant="secondary">{style}</Badge>
                    <Badge variant="default" className="bg-accent text-accent-foreground">{atmosphere}</Badge>
                </div>
              </div>
              <Button onClick={handleSave} variant="secondary">
                <Save className="mr-2 h-4 w-4" /> Salva nell'Atlante
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* GRIGLIA SENSORIALE */}
            <div className="grid sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2 mb-2 text-primary font-bold text-xs uppercase">
                        <Eye className="h-4 w-4" /> Vista
                    </div>
                    <p className="text-sm text-muted-foreground italic">"{tempLocation.sight}"</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2 mb-2 text-primary font-bold text-xs uppercase">
                        <Ear className="h-4 w-4" /> Udito
                    </div>
                    <p className="text-sm text-muted-foreground italic">"{tempLocation.sound}"</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2 mb-2 text-primary font-bold text-xs uppercase">
                        <Wind className="h-4 w-4" /> Olfatto
                    </div>
                    <p className="text-sm text-muted-foreground italic">"{tempLocation.smell}"</p>
                </div>
            </div>

            <Separator />

            {/* PUNTI DI INTERESSE */}
            <div>
                <h4 className="font-bold uppercase text-xs tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                    <Sparkles className="h-3 w-3" /> Punti di Interesse
                </h4>
                <ul className="grid sm:grid-cols-2 gap-2">
                    {tempLocation.pointsOfInterest.map((poi, i) => (
                        <li key={i} className="text-sm p-2 rounded bg-background border flex items-start gap-2">
                            <Info className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                            <span>{poi}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* SEGRETO (MASTER) */}
            <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                <h4 className="font-bold uppercase text-xs tracking-widest text-destructive mb-2 flex items-center gap-2">
                    <Ghost className="h-4 w-4" /> Nota Segreta per il Master
                </h4>
                <p className="text-sm leading-relaxed text-foreground/90">{tempLocation.secret}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ATLANTE DELLA CAMPAGNA */}
      {savedLocations.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-headline text-3xl flex items-center gap-2 border-b pb-2">
            <MapPin className="h-6 w-6 text-primary" /> Atlante della Campagna
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {savedLocations.map((loc) => {
              const details = JSON.parse(loc.details) as LocationDetails;
              return (
                <Card key={loc.id} className="group hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="font-headline text-xl text-primary leading-tight line-clamp-1">{loc.name}</CardTitle>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(loc.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="outline" className="text-[9px] px-1 h-4">{loc.scale.split(' ')[0]}</Badge>
                        <Badge variant="secondary" className="text-[9px] px-1 h-4">{loc.style}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground line-clamp-3 italic mb-4">"{details.sight}"</p>
                    <div className="space-y-1 pt-2 border-t">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Punti di Interesse:</p>
                        {details.pointsOfInterest.map((p, i) => (
                            <div key={i} className="text-[11px] truncate flex items-center gap-1">
                                <div className="h-1 w-1 rounded-full bg-accent" /> {p}
                            </div>
                        ))}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 justify-end">
                      <Button variant="ghost" size="sm" className="text-[10px] h-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setTempLocation(details)}>
                          <Eye className="mr-1 h-3 w-3" /> Vedi Scheda Completa
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
