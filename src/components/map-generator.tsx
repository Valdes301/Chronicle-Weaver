'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Map, Wand2, Download, Image as ImageIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from "@/hooks/use-toast";
import * as actions from '@/lib/actions';

export function MapGenerator() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSvg, setGeneratedSvg] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerateMap = async () => {
    if (!prompt.trim()) {
        toast({
            variant: "destructive",
            title: "Descrizione Mancante",
            description: "Per favore, inserisci una descrizione per la mappa.",
        });
        return;
    }
    setIsGenerating(true);
    setGeneratedSvg(null);
    try {
      const result = await actions.generateMapAction(prompt);
      if (result.success && result.data?.svgString) {
        setGeneratedSvg(result.data.svgString);
        toast({
          title: "Mappa Generata!",
          description: "La tua mappa personalizzata è pronta.",
        });
      } else {
        throw new Error(result.error || 'Impossibile generare la mappa.');
      }
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Errore di Generazione IA",
        description: error.message,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedSvg) return;
    const blob = new Blob([generatedSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mappa-generata-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center text-2xl">
            <Map className="mr-2" /> Generatore di Mappe
          </CardTitle>
          <CardDescription>
            Descrivi la mappa che vuoi creare. Sii dettagliato per ottenere i migliori risultati (es. "una mappa di una regione costiera con una foresta incantata a nord, una catena montuosa a est e una città portuale chiamata Silverwind").
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Esempio: Una mappa del tesoro che conduce a un'isola vulcanica, con simboli criptici che indicano pericoli come kraken e vortici..."
            className="min-h-[120px] resize-y"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
          />
          <Button onClick={handleGenerateMap} disabled={isGenerating} className="w-full">
            {isGenerating ? (
              <>
                <Wand2 className="mr-2 h-4 w-4 animate-spin" />
                Generazione in corso...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Genera Mappa
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {(isGenerating || generatedSvg) && (
        <Card className="animate-in fade-in duration-500">
            <CardHeader>
                <CardTitle className="font-headline text-2xl">La Tua Mappa</CardTitle>
                <CardDescription>
                    Ecco la mappa generata dall'IA in formato SVG. Se non sei soddisfatto, modifica la descrizione e riprova.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isGenerating ? (
                     <div className="aspect-video w-full flex flex-col items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                        <ImageIcon className="h-16 w-16 animate-pulse" />
                        <p className="mt-2">L'IA sta disegnando la tua mappa...</p>
                    </div>
                ) : (
                    generatedSvg && (
                        <div 
                            className="relative aspect-video w-full overflow-hidden rounded-lg border bg-white"
                            dangerouslySetInnerHTML={{ __html: generatedSvg }}
                        />
                    )
                )}
            </CardContent>
            <CardFooter>
                 <Button onClick={handleDownload} disabled={!generatedSvg || isGenerating} className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Scarica Mappa (SVG)
                </Button>
            </CardFooter>
        </Card>
      )}
    </div>
  );
}
