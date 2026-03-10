'use client';

import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import * as actions from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUp, Loader2, Download, Sparkles, BookOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';

// Scala per Alta Risoluzione (circa 480 DPI)
const PRINT_SCALE = 5; 

export function CardBackgroundUploader() {
    const [isUploading, setIsUploading] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const { toast } = useToast();

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, target: string) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast({
                variant: 'destructive',
                title: 'Immagine troppo grande',
                description: 'Per favore, scegli un file più piccolo di 2MB.',
            });
            return;
        }

        setIsUploading(target);
        const reader = new FileReader();
        reader.onload = async (e) => {
            const imageData = e.target?.result as string;
            try {
                const result = await actions.uploadCardBackground(imageData, target);
                if (result.success) {
                    toast({
                        title: 'Immagine Aggiornata!',
                        description: `L'immagine per "${target}" è stata salvata.`,
                    });
                    // Force refresh to clear cache if needed
                    setTimeout(() => window.location.reload(), 500);
                } else {
                    throw new Error(result.error || "Errore durante il caricamento.");
                }
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: "Errore di caricamento",
                    description: error.message,
                });
            } finally {
                setIsUploading(null);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleDownloadBackA4 = async (imageType: 'magie' | 'oggetti') => {
        setIsGenerating(true);
        toast({ title: 'Generazione foglio A4 retri (Alta Risoluzione)...' });

        const printContainer = document.createElement('div');
        printContainer.style.position = 'fixed';
        printContainer.style.left = '-10000px';
        printContainer.style.top = '-10000px';
        printContainer.style.width = '794px';
        printContainer.style.height = '1123px';
        printContainer.style.background = 'white';
        printContainer.style.pointerEvents = 'none';
        printContainer.style.zIndex = '-9999';
        document.body.appendChild(printContainer);

        const root = createRoot(printContainer);
        const imageUrl = imageType === 'magie' ? '/card-back-magie.jpg' : '/card-back-oggetti.jpg';

        const PageComponent = (
            <div 
                style={{ 
                    width: '794px', 
                    height: '1123px', 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(3, 1fr)', 
                    gridTemplateRows: 'repeat(3, 1fr)',
                    padding: '40px',
                    gap: '20px',
                    justifyItems: 'center',
                    alignItems: 'center',
                    backgroundColor: 'white'
                }}
            >
                {Array.from({ length: 9 }).map((_, i) => (
                    <div 
                        key={i}
                        style={{ 
                            width: '215px', // 5.7cm
                            height: '333px', // 8.8cm
                            border: '2px solid black',
                            borderRadius: '12px',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundImage: `url('${imageUrl}?t=${Date.now()}')`,
                            backgroundColor: '#f3f4f6',
                            imageRendering: '-webkit-optimize-contrast'
                        }} 
                    />
                ))}
            </div>
        );

        try {
            root.render(PageComponent);
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const canvas = await html2canvas(printContainer, { 
                scale: PRINT_SCALE,
                useCORS: true,
                width: 794,
                height: 1123,
                backgroundColor: '#ffffff',
                logging: false
            });

            // Nome file dinamico per i retri
            const now = new Date();
            const dateStr = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;
            const prefix = imageType === 'magie' ? 'MC_RETRO' : 'IC_RETRO';

            const link = document.createElement('a');
            link.download = `${prefix}_${dateStr}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast({ title: 'Foglio scaricato correttamente!' });
        } catch (e: any) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Errore', description: "Impossibile generare l'immagine. Assicurati di aver caricato il retro." });
        } finally {
            root.unmount();
            if (document.body.contains(printContainer)) {
                document.body.removeChild(printContainer);
            }
            setIsGenerating(false);
        }
    };

    return (
        <div className="grid gap-8 md:grid-cols-2">
            {/* CARTE MAGIA */}
            <Card className="shadow-lg border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-6 w-6 text-primary" /> Personalizza Magie
                    </CardTitle>
                    <CardDescription>Gestisci lo stile frontale e il retro per gli incantesimi.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold text-muted-foreground">Sfondo Fronte (Texture)</Label>
                        <Input id="front-magie" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'card-front-magie.jpg')} className="hidden" disabled={!!isUploading} />
                        <Button variant="outline" className="w-full" asChild disabled={!!isUploading}>
                            <label htmlFor="front-magie" className="cursor-pointer">
                                {isUploading === 'card-front-magie.jpg' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageUp className="mr-2 h-4 w-4" />}
                                Carica Sfondo Fronte
                            </label>
                        </Button>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold text-muted-foreground">Retro della Carta</Label>
                        <Input id="back-magie" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'card-back-magie.jpg')} className="hidden" disabled={!!isUploading} />
                        <Button variant="outline" className="w-full" asChild disabled={!!isUploading}>
                            <label htmlFor="back-magie" className="cursor-pointer">
                                {isUploading === 'card-back-magie.jpg' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageUp className="mr-2 h-4 w-4" />}
                                Carica Immagine Retro
                            </label>
                        </Button>
                    </div>

                    <Button onClick={() => handleDownloadBackA4('magie')} disabled={isGenerating} className="w-full shadow-md">
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Genera Foglio A4 Retri (3x3)
                    </Button>
                </CardContent>
            </Card>

            {/* CARTE OGGETTO */}
            <Card className="shadow-lg border-accent/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-accent" /> Personalizza Oggetti
                    </CardTitle>
                    <CardDescription>Gestisci lo stile frontale e il retro per armature, armi e oggetti.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold text-muted-foreground">Sfondo Fronte (Texture)</Label>
                        <Input id="front-oggetti" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'card-front-oggetti.jpg')} className="hidden" disabled={!!isUploading} />
                        <Button variant="outline" className="w-full" asChild disabled={!!isUploading}>
                            <label htmlFor="front-oggetti" className="cursor-pointer">
                                {isUploading === 'card-front-oggetti.jpg' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageUp className="mr-2 h-4 w-4" />}
                                Carica Sfondo Fronte
                            </label>
                        </Button>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold text-muted-foreground">Retro della Carta</Label>
                        <Input id="back-oggetti" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'card-back-oggetti.jpg')} className="hidden" disabled={!!isUploading} />
                        <Button variant="outline" className="w-full" asChild disabled={!!isUploading}>
                            <label htmlFor="back-oggetti" className="cursor-pointer">
                                {isUploading === 'card-back-oggetti.jpg' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageUp className="mr-2 h-4 w-4" />}
                                Carica Immagine Retro
                            </label>
                        </Button>
                    </div>

                    <Button onClick={() => handleDownloadBackA4('oggetti')} disabled={isGenerating} variant="secondary" className="w-full shadow-md">
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Genera Foglio A4 Retri (3x3)
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
