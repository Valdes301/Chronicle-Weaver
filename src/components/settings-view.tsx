
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, ShieldCheck, Key, RefreshCw, Loader2, AlertTriangle, ShieldAlert, Trash2, AlertCircle, BarChart3, Activity, Zap, History, FolderOpen, Image as ImageIcon, FileText, Link2 } from 'lucide-react';
import * as actions from '@/lib/actions';
import { Badge } from './ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle, 
    AlertDialogTrigger 
} from "./ui/alert-dialog";
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

export function SettingsView({ campaignId }: { campaignId: string }) {
    const [status, setStatus] = useState<any[]>([]);
    const [apiStats, setApiStats] = useState<any[]>([]);
    const [assets, setAssets] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isRelinking, setIsRelinking] = useState(false);
    const [isDeletingAsset, setIsDeletingAsset] = useState<string | null>(null);
    const { toast } = useToast();

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [statusRes, statsRes, assetsRes] = await Promise.all([
                actions.getSystemStatus(),
                actions.getApiUsageStats(),
                actions.listAssetsAction()
            ]);
            if (statusRes.success && statusRes.data) setStatus(statusRes.data);
            if (statsRes.success && statsRes.data) setApiStats(statsRes.data);
            if (assetsRes.success && assetsRes.data) setAssets(assetsRes.data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteCampaign = async () => {
        setIsDeleting(true);
        try {
            const res = await actions.deleteCampaign(campaignId);
            if (res.success) {
                toast({ title: "Campagna Eliminata", description: "Verrai reindirizzato alla pagina principale." });
                window.location.href = '/';
            } else throw new Error(res.error);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Errore", description: e.message });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleRelink = async () => {
        setIsRelinking(true);
        try {
            const res = await actions.relinkImagesAction();
            if (res.success) {
                toast({ title: "Scansione Completata!", description: `Ricollegate ${res.data?.relinkedCount || 0} immagini ai personaggi.` });
                loadData();
            } else throw new Error(res.error);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Errore Ricollegamento", description: e.message });
        } finally {
            setIsRelinking(false);
        }
    };

    const handleDeleteAsset = async (filename: string) => {
        setIsDeletingAsset(filename);
        try {
            const res = await actions.deleteAssetAction(filename);
            if (res.success) {
                toast({ title: "File eliminato." });
                setAssets(prev => prev.filter(a => a.name !== filename));
            } else throw new Error(res.error);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Errore", description: e.message });
        } finally {
            setIsDeletingAsset(null);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const allConfigured = status.length > 0 && status.every(s => s.configured);
    const totalAssetsSize = assets.reduce((acc, curr) => acc + curr.size, 0);
    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-12 pb-20">
            {/* GESTIONE ASSET (MANUALE) */}
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-headline text-xl uppercase tracking-widest flex items-center gap-2">
                        <FolderOpen className="h-5 w-5 text-primary" /> Gestione File e Memoria
                    </h3>
                    <div className="flex items-center gap-4">
                        <Badge variant="outline" className="text-[10px] uppercase">{assets.length} file • {formatSize(totalAssetsSize)}</Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadData}>
                            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                        </Button>
                    </div>
                </div>

                <Card className="border-primary/10 bg-muted/5">
                    <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
                        <CardDescription className="text-[11px] italic">
                            Qui puoi gestire manualmente i file salvati nella cartella 'data/assets' del Raspberry Pi.
                        </CardDescription>
                        <Button variant="outline" size="sm" onClick={handleRelink} disabled={isRelinking} className="h-8 gap-2 text-[10px] uppercase font-bold border-accent/40 text-accent hover:bg-accent/10">
                            {isRelinking ? <Loader2 className="h-3 w-3 animate-spin"/> : <Link2 className="h-3 w-3" />}
                            Ricollega Asset Dispersi
                        </Button>
                    </CardHeader>
                    <CardContent className="p-4">
                        <ScrollArea className="h-[350px] pr-4">
                            {assets.length === 0 ? (
                                <div className="py-20 text-center opacity-30 italic text-sm">Cartella asset vuota.</div>
                            ) : (
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {assets.map((asset) => (
                                        <div key={asset.name} className="flex flex-col p-3 rounded-lg border bg-background group relative overflow-hidden">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="h-10 w-10 rounded bg-muted overflow-hidden shrink-0 border relative">
                                                    {asset.name.match(/\.(jpg|jpeg|png|webp|svg)$/i) ? (
                                                        <img src={asset.url} alt={asset.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <FileText className="h-full w-full p-2 opacity-20" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-bold truncate uppercase tracking-tighter" title={asset.name}>{asset.name}</p>
                                                    <p className="text-[9px] text-muted-foreground">{formatSize(asset.size)} • {new Date(asset.createdAt).toLocaleDateString('it-IT')}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 mt-auto items-center">
                                                <Button variant="ghost" size="sm" className="h-8 text-xs uppercase font-bold w-full" asChild>
                                                    <a href={asset.url} target="_blank" rel="noreferrer">Apri</a>
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/80 hover:text-destructive shrink-0" disabled={isDeletingAsset === asset.name}>
                                                            {isDeletingAsset === asset.name ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="w-[95vw] max-w-md">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Eliminare questo file?</AlertDialogTitle>
                                                            <AlertDialogDescription>L'operazione è irreversibile e il file verrà rimosso dal disco del Raspberry Pi.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteAsset(asset.name)} className="bg-destructive text-destructive-foreground">Elimina</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {/* MONITORAGGIO QUOTE API */}
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-headline text-xl uppercase tracking-widest flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" /> Analitica Risorse IA
                    </h3>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {apiStats.map((stat) => {
                        const rpmPerc = Math.min(100, (stat.rpm / 15) * 100);
                        const rpdPerc = Math.min(100, (stat.rpd / 1500) * 100);
                        const isHighUsage = rpmPerc > 80 || rpdPerc > 80;

                        return (
                            <Card key={stat.service} className={cn("bg-muted/10 border-border/50", isHighUsage && "border-amber-500/40 bg-amber-500/5")}>
                                <CardHeader className="p-4 pb-2">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{stat.service}</CardTitle>
                                        <Badge variant={stat.status === 'success' ? 'default' : 'destructive'} className="h-4 text-[8px] uppercase">
                                            {stat.status === 'success' ? 'Attivo' : 'Errore'}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 space-y-4">
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-[9px] font-bold uppercase">
                                            <span className="flex items-center gap-1"><Activity className="h-2.5 w-2.5" /> RPM (Minuto)</span>
                                            <span className={cn(rpmPerc > 80 ? "text-destructive" : "text-primary")}>{stat.rpm} / 15</span>
                                        </div>
                                        <Progress value={rpmPerc} className="h-1" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-[9px] font-bold uppercase">
                                            <span className="flex items-center gap-1"><History className="h-2.5 w-2.5" /> RPD (Giorno)</span>
                                            <span>{stat.rpd} / 1500</span>
                                        </div>
                                        <Progress value={rpdPerc} className="h-1 bg-muted/20" />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className={allConfigured ? "border-emerald-500/20 bg-emerald-500/5" : "border-destructive/20 bg-destructive/5"}>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between text-sm uppercase tracking-widest">
                            Configurazione API
                            {allConfigured ? <CheckCircle2 className="text-emerald-500 h-5 w-5" /> : <ShieldAlert className="text-destructive h-5 w-5" />}
                        </CardTitle>
                        <CardDescription className="text-[11px]">Rilevamento chiavi nel file .env</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            {status.map(s => (
                                <div key={s.name} className="flex items-center justify-between p-2 rounded border bg-background/50">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-mono font-bold">{s.name}</span>
                                        <span className="text-[10px] text-muted-foreground">{s.preview}</span>
                                    </div>
                                    <Badge variant={s.configured ? "default" : "outline"} className={s.configured ? "bg-emerald-600 h-5 text-[10px]" : "h-5 text-[10px]"}>
                                        {s.configured ? "Valida" : "Assente"}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest">
                                <AlertTriangle className="h-4 w-4 text-amber-500" /> Diagnostica
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs space-y-4 text-muted-foreground">
                            <p>Se riscontri errori frequenti, verifica che le chiavi API non abbiano superato i limiti di quota su Google Cloud Console.</p>
                            <Button onClick={loadData} variant="outline" className="w-full gap-2 h-9 text-[10px] uppercase font-bold">
                                <RefreshCw className="h-3.5 w-3.5" /> Ricarica Diagnostica
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-destructive/30 bg-destructive/5 overflow-hidden">
                        <CardHeader className="bg-destructive/10">
                            <CardTitle className="text-[10px] uppercase tracking-[0.2em] text-destructive flex items-center gap-2">
                                <AlertCircle className="h-3.5 w-3.5" /> Zona Pericolo
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <p className="text-[11px] text-muted-foreground italic">
                                L'eliminazione è irreversibile e rimuoverà tutti i dati della campagna dal server.
                            </p>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" className="w-full gap-2 h-9 text-[10px] uppercase font-bold shadow-lg shadow-destructive/20" disabled={isDeleting}>
                                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                                        Elimina Campagna Definitivamente
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="w-[95vw] max-w-md">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Questa azione non può essere annullata. Tutti i progressi, le mappe, i PNG e le cronache di questa campagna andranno persi per sempre.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeleteCampaign} className="bg-destructive text-destructive-foreground">
                                            Sì, Procedi all'Eliminazione
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
