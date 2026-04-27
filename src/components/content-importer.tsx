'use client';

import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import * as actions from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileUp, Wand2 } from 'lucide-react';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { useRouter } from 'next/navigation';

type ContentImporterProps = {
  campaignId: string;
};

export function ContentImporter({ campaignId }: ContentImporterProps) {
  const [textContent, setTextContent] = useState<string>('');
  const [fileName, setFileName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        setTextContent(text);
      } else {
        toast({
          variant: "destructive",
          title: "Errore di Lettura",
          description: "Impossibile leggere il contenuto del file.",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!textContent.trim()) {
      toast({
        variant: "destructive",
        title: "Nessun Contenuto",
        description: "Per favore, carica un file o incolla del testo da importare.",
      });
      return;
    }
    setIsImporting(true);
    try {
      const result = await actions.importContentAction(textContent, campaignId);
      if (result.success) {
        const { addedItems, addedWeapons, addedArmors, addedMonsters, addedSpells, addedSkills } = result.data || {};
        
        const parts = [];
        if (addedItems && addedItems > 0) parts.push(`${addedItems} oggetti`);
        if (addedWeapons && addedWeapons > 0) parts.push(`${addedWeapons} armi`);
        if (addedArmors && addedArmors > 0) parts.push(`${addedArmors} armature`);
        if (addedMonsters && addedMonsters > 0) parts.push(`${addedMonsters} mostri`);
        if (addedSpells && addedSpells > 0) parts.push(`${addedSpells} incantesimi`);
        if (addedSkills && addedSkills > 0) parts.push(`${addedSkills} abilità`);

        const description = parts.length > 0 ? `Aggiunti: ${parts.join(', ')}.` : "Nessun nuovo contenuto aggiunto.";
        
        toast({
          title: "Importazione Completata!",
          description,
        });

        // Reset state
        setTextContent('');
        setFileName('');
        const fileInput = document.getElementById('content-file-input') as HTMLInputElement;
        if(fileInput) fileInput.value = '';
        
        router.refresh();

      } else {
        throw new Error(result.error || "Errore sconosciuto durante l'importazione.");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Errore durante l'Importazione",
        description: error.message,
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center text-2xl">
          <FileUp className="mr-2" /> Importatore di Contenuti Intelligente
        </CardTitle>
        <CardDescription>
          Carica un file di testo (.txt) o JSON (.json), oppure incolla direttamente il contenuto. 
          L'IA analizzerà, strutturerà e aggiungerà i dati ai database della tua campagna.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
            <Label htmlFor="content-file-input">Opzione 1: Carica un file (.txt o .json)</Label>
            <Input 
                id="content-file-input"
                type="file" 
                accept=".txt,.json" 
                onChange={handleFileChange} 
                className="mt-1"
                disabled={isImporting}
            />
            {fileName && <p className="text-sm text-muted-foreground mt-2">File selezionato: {fileName}</p>}
        </div>

        <div className="flex items-center space-x-2">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">O</span>
            <Separator className="flex-1" />
        </div>
        
        <div>
            <Label htmlFor="content-textarea">Opzione 2: Incolla il contenuto qui</Label>
            <Textarea
                id="content-textarea"
                placeholder='Incolla qui il tuo contenuto JSON o di testo...'
                className="mt-1 min-h-[200px] font-mono text-xs"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                disabled={isImporting}
            />
        </div>
        
        <Button onClick={handleImport} disabled={!textContent.trim() || isImporting} className="w-full">
          {isImporting ? (
            <>
              <Wand2 className="mr-2 h-4 w-4 animate-spin" />
              Analisi e Importazione in corso...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Importa Contenuti con l'IA
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
