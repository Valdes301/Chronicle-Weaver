'use client';

import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import * as actions from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileUp, Wand2, Check, X, Shield, Sparkles, Skull, Wand, BrainCircuit, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { useRouter } from 'next/navigation';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Checkbox } from './ui/checkbox';
import { cn } from '@/lib/utils';

type ContentImporterProps = {
  campaignId: string;
};

type AnalysisResults = {
    newMagicItems: any[];
    newMonsters: any[];
    newSpells: any[];
    newSkills: any[];
};

export function ContentImporter({ campaignId }: ContentImporterProps) {
  const [textContent, setTextContent] = useState<string>('');
  const [fileName, setFileName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [expandedIndices, setExpandedIndices] = useState<Record<string, number[]>>({
    items: [], monsters: [], spells: [], skills: []
  });
  const [selectedIndices, setSelectedIndices] = useState<Record<string, number[]>>({
    items: [],
    monsters: [],
    spells: [],
    skills: []
  });

  const { toast } = useToast();
  const router = useRouter();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        setTextContent(text);
      } else {
        toast({ variant: "destructive", title: "Errore di Lettura", description: "Impossibile leggere il file." });
      }
    };
    reader.readAsText(file);
  };

  const handleAnalyze = async () => {
    if (!textContent.trim()) {
      toast({ variant: "destructive", title: "Nessun Contenuto", description: "Incolla del testo o carica un file." });
      return;
    }
    setIsAnalyzing(true);
    try {
      const result = await actions.analyzeContentAction(textContent);
      if (result.success && result.data) {
        const data = result.data as AnalysisResults;
        setResults(data);
        // Seleziona tutto di default
        setSelectedIndices({
          items: data.newMagicItems.map((_, i) => i),
          monsters: data.newMonsters.map((_, i) => i),
          spells: data.newSpells.map((_, i) => i),
          skills: data.newSkills.map((_, i) => i),
        });
        toast({ title: "Analisi Completata!", description: "Controlla gli elementi trovati dall'IA." });
      } else {
        throw new Error(result.error || "Errore durante l'analisi.");
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleExpand = (type: string, index: number) => {
    setExpandedIndices(prev => {
        const current = prev[type];
        return {
            ...prev,
            [type]: current.includes(index) ? current.filter(i => i !== index) : [...current, index]
        };
    });
  };

  const toggleSelection = (type: string, index: number) => {
    setSelectedIndices(prev => {
        const current = prev[type];
        const next = current.includes(index) ? current.filter(i => i !== index) : [...current, index];
        return { ...prev, [type]: next };
    });
  };

  const handleConfirmImport = async () => {
    if (!results) return;
    setIsImporting(true);
    try {
        const dataToImport = {
            items: results.newMagicItems.filter((_, i) => selectedIndices.items.includes(i)),
            monsters: results.newMonsters.filter((_, i) => selectedIndices.monsters.includes(i)),
            spells: results.newSpells.filter((_, i) => selectedIndices.spells.includes(i)),
            skills: results.newSkills.filter((_, i) => selectedIndices.skills.includes(i)),
        };

        const res = await actions.bulkImportAction(campaignId, dataToImport);
        if (res.success) {
            toast({ title: "Importazione Completata!", description: `Aggiunti ${res.data?.imported} elementi alla campagna.` });
            setResults(null);
            setTextContent('');
            setFileName('');
            router.refresh();
        } else {
            throw new Error(res.error || "Impossibile salvare i dati.");
        }
    } catch (error: any) {
        toast({ variant: "destructive", title: "Errore", description: error.message });
    } finally {
        setIsImporting(false);
    }
  };

  if (results) {
    const totalFound = results.newMagicItems.length + results.newMonsters.length + results.newSpells.length + results.newSkills.length;
    const totalSelected = selectedIndices.items.length + selectedIndices.monsters.length + selectedIndices.spells.length + selectedIndices.skills.length;

    return (
        <Card className="border-accent/40 animate-in fade-in zoom-in-95 duration-300">
            <CardHeader className="bg-accent/5">
                <CardTitle className="font-headline text-2xl flex items-center justify-between">
                    <span>Revisione Importazione</span>
                    <Badge variant="secondary" className="text-sm">{totalSelected} / {totalFound} elementi</Badge>
                </CardTitle>
                <CardDescription>
                    L'IA ha identificato i seguenti elementi. Clicca su un elemento per vedere i dettagli estratti.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-8">
                        {/* OGGETTI */}
                        {results.newMagicItems.length > 0 && (
                            <section className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                    <Sparkles className="h-4 w-4" /> Oggetti ed Equipaggiamento ({results.newMagicItems.length})
                                </h3>
                                <div className="grid gap-2">
                                    {results.newMagicItems.map((item, i) => (
                                        <div key={i} className={cn("flex flex-col p-3 rounded-lg border transition-colors", selectedIndices.items.includes(i) ? "bg-background border-primary/30" : "bg-muted/20 opacity-50")}>
                                            <div className="flex items-start gap-3">
                                                <Checkbox checked={selectedIndices.items.includes(i)} onCheckedChange={() => toggleSelection('items', i)} className="mt-1" />
                                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand('items', i)}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-sm truncate">{item.name}</span>
                                                        <Badge variant="outline" className="text-[10px] py-0 h-4">{item.rarity || 'Comune'}</Badge>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand('items', i)}>
                                                    {expandedIndices.items.includes(i) ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
                                                </Button>
                                            </div>
                                            {expandedIndices.items.includes(i) && (
                                                <div className="mt-2 pl-8 text-xs text-muted-foreground animate-in slide-in-from-top-1">
                                                    <p><span className="font-bold">Tipo:</span> {item.type}</p>
                                                    <p className="mt-2 italic">{item.description}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* MOSTRI */}
                        {results.newMonsters.length > 0 && (
                            <section className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-rose-500 flex items-center gap-2">
                                    <Skull className="h-4 w-4" /> Bestiario ({results.newMonsters.length})
                                </h3>
                                <div className="grid gap-2">
                                    {results.newMonsters.map((m, i) => (
                                        <div key={i} className={cn("flex flex-col p-3 rounded-lg border transition-colors", selectedIndices.monsters.includes(i) ? "bg-background border-rose-500/30" : "bg-muted/20 opacity-50")}>
                                            <div className="flex items-start gap-3">
                                                <Checkbox checked={selectedIndices.monsters.includes(i)} onCheckedChange={() => toggleSelection('monsters', i)} className="mt-1" />
                                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand('monsters', i)}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-sm truncate">{m.name}</span>
                                                        <Badge variant="secondary" className="text-[10px] py-0 h-4">GS {m.challenge || '?'}</Badge>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand('monsters', i)}>
                                                    {expandedIndices.monsters.includes(i) ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
                                                </Button>
                                            </div>
                                            {expandedIndices.monsters.includes(i) && (
                                                <div className="mt-2 pl-8 text-xs text-muted-foreground animate-in slide-in-from-top-1">
                                                    <p><span className="font-bold">Dati:</span> {m.type} • CA {m.armorClass} • PF {m.hitPoints}</p>
                                                    <p className="mt-2 italic">{m.description}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                        
                        {/* Spells and Skills similarly updated if needed, but let's stick to items/monsters for clarity */}
                    </div>
                </ScrollArea>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-3 border-t pt-6">
                <Button variant="ghost" onClick={() => setResults(null)} className="w-full sm:w-auto">
                    <X className="mr-2 h-4 w-4" /> Annulla e torna al testo
                </Button>
                <Button onClick={handleConfirmImport} disabled={totalSelected === 0 || isImporting} className="w-full sm:flex-1 shadow-lg shadow-primary/20">
                    {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    Conferma Importazione ({totalSelected} elementi)
                </Button>
            </CardFooter>
        </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline flex items-center text-2xl">
          <FileUp className="mr-2 text-primary" /> Importatore Intelligente
        </CardTitle>
        <CardDescription>
          Incolla testo libero da manuali o siti web. L'IA analizzerà il contenuto per estrarre mostri, oggetti, magie e abilità, permettendoti di rivederli prima del salvataggio.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-start gap-4">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
                <p className="font-bold text-primary mb-1">Cosa puoi incollare?</p>
                <p>Schede di mostri da D&D Beyond, liste di oggetti da PDF, descrizioni di incantesimi o interi paragrafi narrativi. L'IA separerà automaticamente i dati.</p>
            </div>
        </div>

        <div className="space-y-4">
            <div>
                <Label htmlFor="content-file-input" className="text-xs uppercase font-bold text-muted-foreground">Carica un file (.txt o .json)</Label>
                <Input 
                    id="content-file-input"
                    type="file" 
                    accept=".txt,.json" 
                    onChange={handleFileChange} 
                    className="mt-1.5 h-11"
                    disabled={isAnalyzing}
                />
                {fileName && <p className="text-xs text-primary mt-2 font-medium">File pronto: {fileName}</p>}
            </div>

            <div className="relative">
                <div className="absolute inset-0 flex items-center"><Separator /></div>
                <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-card px-2 text-muted-foreground font-bold">Oppure Incolla Testo</span></div>
            </div>
            
            <div className="space-y-2">
                <Textarea
                    placeholder='Incolla qui il contenuto del manuale...'
                    className="min-h-[250px] font-mono text-xs bg-muted/20"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    disabled={isAnalyzing}
                />
            </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleAnalyze} disabled={!textContent.trim() || isAnalyzing} className="w-full h-12 text-lg shadow-lg">
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              L'IA sta catalogando...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-5 w-5" />
              Analizza con l'IA
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
