
'use client';

import { useState } from 'react';
import type { Npc, NpcDetails, CampaignWithRelations, GenerateNpcInput } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Wand2, Save, Trash2, Eye, Ear, Star, ShieldAlert, User, Footprints } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as actions from '@/lib/actions';
import { useRouter } from 'next/navigation';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';

type NpcGeneratorProps = {
  campaign: CampaignWithRelations;
  savedNpcs: Npc[];
};

export function NpcGenerator({ campaign, savedNpcs }: NpcGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [gender, setGender] = useState<GenerateNpcInput['gender']>('Maschio');
  const [age, setAge] = useState<GenerateNpcInput['age']>('Adulto');
  const [status, setStatus] = useState<GenerateNpcInput['status']>('Normale');
  const [alignment, setAlignment] = useState<GenerateNpcInput['alignment']>('Neutrale');
  const [race, setRace] = useState<string>('');

  const [tempNpc, setTempNpc] = useState<NpcDetails | null>(null);

  const { toast } = useToast();
  const router = useRouter();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await actions.generateNpcAction({
        gender,
        age,
        status,
        alignment,
        race: race || undefined,
        campaignSummary: campaign.summary || undefined,
      });

      if (!result.success || !result.data) throw new Error(result.error || "Errore IA");

      setTempNpc(result.data);
      toast({ title: "PNG Generato!", description: `L'IA ha presentato "${result.data.name}".` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!tempNpc) return;

    const result = await actions.saveNpc({
      campaignId: campaign.id,
      name: tempNpc.name,
      race: tempNpc.race,
      gender,
      age,
      status,
      alignment,
      details: JSON.stringify(tempNpc)
    });

    if (result.success) {
      toast({ title: "PNG Salvato nell'Anagrafe!" });
      setTempNpc(null);
      router.refresh();
    } else {
      toast({ variant: "destructive", title: "Errore", description: result.error || "Impossibile salvare." });
    }
  };

  const handleDelete = async (id: string) => {
    const result = await actions.deleteNpc(id);
    if (result.success) {
      toast({ title: "PNG rimosso dall'Anagrafe" });
      router.refresh();
    }
  };

  return (
    <div className="space-y-8">
      {/* CONFIGURAZIONE GENERATORE */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-headline">
            <UserPlus className="h-6 w-6 text-primary" /> Emporio dei Volti
          </CardTitle>
          <CardDescription>Genera personaggi unici con tratti psicologici, segreti e ganci per incontri memorabili.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Genere</Label>
              <Select value={gender} onValueChange={(v: any) => setGender(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Maschio">Maschio</SelectItem>
                  <SelectItem value="Femmina">Femmina</SelectItem>
                  <SelectItem value="Non binario">Non binario</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Età</Label>
              <Select value={age} onValueChange={(v: any) => setAge(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bambino">Bambino / Ragazzino</SelectItem>
                  <SelectItem value="Ragazzo">Ragazzo / Giovane</SelectItem>
                  <SelectItem value="Adulto">Adulto</SelectItem>
                  <SelectItem value="Vecchio">Anziano / Vecchio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Stato Sociale</Label>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Miserabile">Miserabile / Mendicante</SelectItem>
                  <SelectItem value="Povero">Povero / Semplice</SelectItem>
                  <SelectItem value="Normale">Ceto Medio / Comune</SelectItem>
                  <SelectItem value="Ricco">Ricco / Benestante</SelectItem>
                  <SelectItem value="Sfarzoso">Sfarzoso</SelectItem>
                  <SelectItem value="Nobile">Nobile / Aristocratico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Allineamento Morale</Label>
              <Select value={alignment} onValueChange={(v: any) => setAlignment(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Buono">Buono</SelectItem>
                  <SelectItem value="Neutrale">Neutrale</SelectItem>
                  <SelectItem value="Malvagio">Malvagio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Razza (Opzionale)</Label>
              <Input 
                placeholder="es. Umano, Tiefling, Kenku..." 
                value={race} 
                onChange={(e) => setRace(e.target.value)} 
              />
            </div>
            <div className="pt-8">
               <Button onClick={handleGenerate} disabled={isGenerating} className="w-full h-10 shadow-lg shadow-primary/20">
                {isGenerating ? <Wand2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Genera PNG
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ANTEPRIMA PNG GENERATO */}
      {tempNpc && (
        <Card className="border-accent/40 animate-in fade-in slide-in-from-bottom-4 shadow-xl overflow-hidden">
          <CardHeader className="bg-accent/10 border-b border-accent/20">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl font-headline text-accent uppercase tracking-wider">{tempNpc.name}</CardTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline" className="bg-background/50">{tempNpc.race} {tempNpc.occupation}</Badge>
                    <Badge variant="secondary">{age}</Badge>
                    <Badge variant="default" className={cn(
                        "text-white",
                        alignment === 'Buono' ? 'bg-emerald-600' : alignment === 'Malvagio' ? 'bg-rose-700' : 'bg-slate-600'
                    )}>{alignment}</Badge>
                </div>
              </div>
              <Button onClick={handleSave} variant="secondary">
                <Save className="mr-2 h-4 w-4" /> Salva PNG
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
                {/* COLONNA SINISTRA: DESCRIZIONE */}
                <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/30 border">
                        <div className="flex items-center gap-2 mb-2 text-primary font-bold text-xs uppercase">
                            <Eye className="h-4 w-4" /> Aspetto (Vista)
                        </div>
                        <p className="text-sm leading-relaxed">{tempNpc.appearance}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/30 border">
                        <div className="flex items-center gap-2 mb-2 text-primary font-bold text-xs uppercase">
                            <Ear className="h-4 w-4" /> Personalità (Udito)
                        </div>
                        <p className="text-sm leading-relaxed">{tempNpc.personality}</p>
                    </div>
                </div>

                {/* COLONNA DESTRA: PECULIARITA E SEGRETI */}
                <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                        <div className="flex items-center gap-2 mb-2 text-accent font-bold text-xs uppercase">
                            <Star className="h-4 w-4" /> Peculiarità Memorabile
                        </div>
                        <p className="text-sm italic">"{tempNpc.mannerism}"</p>
                    </div>
                    <div className="p-4 rounded-lg bg-rose-500/5 border border-rose-500/20">
                        <div className="flex items-center gap-2 mb-2 text-rose-500 font-bold text-xs uppercase">
                            <ShieldAlert className="h-4 w-4" /> Segreto o Desiderio
                        </div>
                        <p className="text-sm">{tempNpc.secret}</p>
                    </div>
                </div>
            </div>

            <Separator />

            {/* GANCO INCONTRO */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <h4 className="font-bold uppercase text-xs tracking-widest text-primary mb-2 flex items-center gap-2">
                    <Footprints className="h-4 w-4" /> Gancio per l'Incontro
                </h4>
                <p className="text-sm leading-relaxed font-medium">{tempNpc.encounterHook}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ANAGRAFE DELLA CAMPAGNA */}
      {savedNpcs.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-headline text-3xl flex items-center gap-2 border-b pb-2">
            <User className="h-6 w-6 text-primary" /> Anagrafe dei PNG
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {savedNpcs.map((n) => {
              const details = JSON.parse(n.details) as NpcDetails;
              return (
                <Card key={n.id} className="group hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="font-headline text-xl text-primary leading-tight line-clamp-1">{n.name}</CardTitle>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(n.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex wrap gap-1 mt-1">
                        <Badge variant="outline" className="text-[9px] px-1 h-4">{n.race}</Badge>
                        <Badge variant="secondary" className="text-[9px] px-1 h-4">{n.alignment}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Ruolo:</p>
                    <p className="text-xs text-foreground font-medium mb-3">{details.occupation}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 italic">"{details.appearance}"</p>
                  </CardContent>
                  <CardFooter className="pt-0 justify-end">
                      <Button variant="ghost" size="sm" className="text-[10px] h-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setTempNpc(details)}>
                          <Eye className="mr-1 h-3 w-3" /> Vedi Scheda PNG
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
