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
import { Button } from '@/components/ui/button';
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
  Users,
  BrainCircuit,
  Shield,
  Sparkles,
  Skull,
  Wand,
  Download,
  Upload,
  Plus,
  Map,
  FileUp,
  LayoutGrid,
  Palette,
  Beaker,
  Mail,
  Store,
  MapPin,
  UserCircle,
  Sword,
  Library,
} from 'lucide-react';
import { Icons } from './icons';

type SidebarNavProps = {
  activeView: string;
  onViewChange: (view: string) => void;
  onNewCampaign: () => void;
  onBackup: () => void;
};

const navItems = [
  { id: 'storia', label: 'Storia', icon: ScrollText },
  { id: 'personaggi', label: 'Personaggi', icon: Users },
];

const creativeItems = [
  { id: 'architetto', label: 'Architetto di Mondi', icon: MapPin },
  { id: 'anagrafe', label: 'Emporio dei Volti (PNG)', icon: UserCircle },
  { id: 'combattimenti', label: 'Arena del Destino', icon: Sword },
  { id: 'botteghe', label: 'Botteghe ed Empori', icon: Store },
  { id: 'lettere', label: 'Ordini e Lettere', icon: Mail },
  { id: 'mappe', label: 'Mappe', icon: Map },
];

const handbookItems = [
    { id: 'manuale-importa', label: 'Importazione Intelligente', icon: Library },
    { id: 'abilità', label: 'Abilità', icon: BrainCircuit },
    { id: 'equipaggiamento', label: 'Equipaggiamento', icon: Shield },
    { id: 'oggetti', label: 'Oggetti', icon: Sparkles },
    { id: 'bestiario', label: 'Bestiario', icon: Skull },
    { id: 'magie', label: 'Incantesimi', icon: Wand },
];

const supportItems = [
  { id: 'importa', label: 'Importa Contenuti', icon: FileUp },
  { id: 'layout-sperimentale', label: 'Genera Carte Complete', icon: LayoutGrid },
  { id: 'crea-carte', label: 'Crea Carte (Multiplo)', icon: Beaker },
  { id: 'personalizza', label: 'Personalizza Sfondo', icon: Palette },
];

export function SidebarNav({ activeView, onViewChange, onNewCampaign, onBackup }: SidebarNavProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleViewChange = (view: string) => {
    onViewChange(view);
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-sidebar-accent">
                <Icons.logo className="h-5 w-5 text-primary" />
            </Button>
            <div className="text-lg font-headline font-semibold group-data-[collapsible=icon]:hidden">
                Tessitore di Cronache
            </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* GRUPPO MASTER */}
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

        {/* GRUPPO STRUMENTI CREATIVI (Generatori IA) */}
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
        
        {/* GRUPPO MANUALE */}
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

        {/* GRUPPO SUPPORTO E UTILITY */}
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

        {/* GRUPPO SISTEMA */}
        <SidebarGroup>
            <SidebarGroupLabel>Sistema</SidebarGroupLabel>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={onBackup} tooltip="Esegui Backup">
                      <Download />
                      <span>Esegui Backup</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Ripristina da Backup" className="cursor-pointer">
                      <label htmlFor="restore-backup-input" className="flex items-center gap-2 h-full w-full cursor-pointer px-2">
                        <Upload />
                        <span>Ripristina da Backup</span>
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
                        <AlertDialogContent>
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
