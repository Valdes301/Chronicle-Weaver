'use client';

import { useState, useEffect } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ScrollText,
  BrainCircuit,
  Shield,
  Sparkles,
  Skull,
  Wand,
  Download,
  Upload,
  Plus,
  Map,
  LayoutGrid,
  Palette,
  Hammer,
  Beer,
  Library,
  BookUser,
  LibraryBig,
  Settings,
  MapPin,
  UserCircle,
  Sword,
  Mail,
  Store,
  Users,
  Image as ImageIcon,
} from 'lucide-react';
import { Icons } from './icons';
import { cn } from "@/lib/utils";
import * as actions from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

type SidebarNavProps = {
  activeView: string;
  onViewChange: (view: string | null) => void;
  onNewCampaign: () => void;
  onBackup: () => void;
};

const navItems = [
  { id: 'storia', label: 'Storia', icon: ScrollText },
  { id: 'personaggi', label: 'Personaggi Giocanti', icon: Users },
  { id: 'biblioteca', label: 'Biblioteca delle Cronache', icon: LibraryBig },
  { id: 'riepilogo-png', label: 'Anagrafe dei PNG', icon: UserCircle },
];

const creativeItems = [
  { id: 'architetto', label: 'Architetto di Mondi', icon: MapPin },
  { id: 'combattimenti', label: 'Arena del Destino', icon: Sword },
  { id: 'botteghe', label: 'Botteghe ed Empori', icon: Store },
  { id: 'anagrafe', label: 'Emporio dei Volti (PNG)', icon: UserCircle },
  { id: 'tesori', label: 'Generatore di Tesori', icon: Sparkles },
  { id: 'mappe', label: 'Mappe', icon: Map },
  { id: 'lettere', label: 'Ordini e Lettere', icon: Mail },
  { id: 'taverna', label: 'Taverna', icon: Beer },
].sort((a, b) => a.label.localeCompare(b.label));

const handbookItems = [
    { id: 'manuale-importa', label: 'Importazione Intelligente', icon: Library },
    { id: 'abilità', label: 'Abilità', icon: BrainCircuit },
    { id: 'equipaggiamento', label: 'Equipaggiamento', icon: Shield },
    { id: 'oggetti', label: 'Oggetti', icon: Sparkles },
    { id: 'bestiario', label: 'Bestiario', icon: Skull },
    { id: 'magie', label: 'Incantesimi', icon: Wand },
];

const supportItems = [
  { id: 'layout-sperimentale', label: 'Genera Carte Complete', icon: LayoutGrid },
  { id: 'crea-carte', label: 'Crea Carte (Multiplo)', icon: Hammer },
  { id: 'personalizza', label: 'Personalizza Sfondo', icon: Palette },
];

export function SidebarNav({ activeView, onViewChange, onNewCampaign, onBackup }: SidebarNavProps) {
  const { isMobile, setOpenMobile, toggleSidebar } = useSidebar();
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleViewChange = (view: string) => {
    if (view === 'storia') {
        onViewChange(null);
    } else {
        onViewChange(view);
    }
    
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleAssetsBackup = async () => {
    toast({ title: "Preparazione backup immagini..." });
    const res = await actions.getAssetsBackup();
    if (res.success && res.data) {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        a.download = `backup-immagini-${dateStr}.json`;
        a.click();
        toast({ title: "Backup Immagini Scaricato" });
    } else {
        toast({ variant: 'destructive', title: "Errore", description: res.error });
    }
  };
  
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton 
                    onClick={() => toggleSidebar()}
                    tooltip="Contrai/Espandi Navigazione"
                >
                    <Icons.logo className="size-4 shrink-0" />
                    <span className="truncate font-headline font-bold text-lg">Tessitore</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
            <SidebarGroupLabel>Master</SidebarGroupLabel>
            <SidebarMenu>
            {navItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                    onClick={() => handleViewChange(item.id)}
                    isActive={activeView === item.id}
                    tooltip={item.label}
                >
                    <item.icon />
                    <span>{item.label}</span>
                </SidebarMenuButton>
                </SidebarMenuItem>
            ))}
            </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
            <SidebarGroupLabel>Strumenti Creativi</SidebarGroupLabel>
            <SidebarMenu>
            {creativeItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                    onClick={() => handleViewChange(item.id)}
                    isActive={activeView === item.id}
                    tooltip={item.label}
                >
                    <item.icon />
                    <span>{item.label}</span>
                </SidebarMenuButton>
                </SidebarMenuItem>
            ))}
            </SidebarMenu>
        </SidebarGroup>
        
        <SidebarGroup>
            <SidebarGroupLabel>Manuale</SidebarGroupLabel>
            <SidebarMenu>
                 {handbookItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                        onClick={() => handleViewChange(item.id)}
                        isActive={activeView === item.id}
                        tooltip={item.label}
                    >
                        <item.icon />
                        <span>{item.label}</span>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
            <SidebarGroupLabel>Avanzate</SidebarGroupLabel>
            <SidebarMenu>
                {supportItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                        onClick={() => handleViewChange(item.id)}
                        isActive={activeView === item.id}
                        tooltip={item.label}
                    >
                        <item.icon />
                        <span>{item.label}</span>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
            <SidebarGroupLabel>Sistema</SidebarGroupLabel>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton 
                        onClick={() => handleViewChange('homebrew')} 
                        isActive={activeView === 'homebrew'} 
                        tooltip="Compendio Homebrew"
                    >
                      <Hammer />
                      <span>Compendio Homebrew</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                    <SidebarMenuButton 
                        onClick={() => handleViewChange('impostazioni')} 
                        isActive={activeView === 'impostazioni'} 
                        tooltip="Stato Sistema e API"
                    >
                      <Settings />
                      <span>Stato Sistema e API</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                    <SidebarMenuButton onClick={onBackup} tooltip="Backup Dati (Leggero)">
                      <Download />
                      <span>Backup Dati</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleAssetsBackup} tooltip="Backup Immagini (Pesante)">
                      <ImageIcon />
                      <span>Backup Immagini</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Ripristina da Backup" className="cursor-pointer">
                      <label htmlFor="restore-backup-input" className="flex items-center gap-2 h-full w-full cursor-pointer px-2">
                        <Upload />
                        <span>Ripristina Backup</span>
                      </label>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  {isClient ? (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <SidebarMenuButton tooltip="Nuova Campagna" className="text-destructive/80 hover:bg-destructive/10 hover:text-destructive">
                                <Plus />
                                <span>Nuova Campagna</span>
                            </SidebarMenuButton>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="w-[95vw]">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Creare una Nuova Campagna?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Questo ti porterà alla schermata di creazione di una nuova campagna. La campagna attuale non sarà modificata.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Annulla</AlertDialogCancel>
                                <AlertDialogAction onClick={onNewCampaign}>Continua</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <SidebarMenuButton tooltip="Nuova Campagna" className="text-destructive/80 hover:bg-destructive/10 hover:text-destructive" disabled>
                        <Plus />
                        <span>Nuova Campagna</span>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
