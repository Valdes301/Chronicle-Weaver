
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
  SidebarSeparator,
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

const handbookItems = [
    { id: 'abilità', label: 'Abilità', icon: BrainCircuit },
    { id: 'equipaggiamento', label: 'Equipaggiamento', icon: Shield },
    { id: 'oggetti', label: 'Oggetti', icon: Sparkles },
    { id: 'bestiario', label: 'Bestiario', icon: Skull },
    { id: 'magie', label: 'Incantesimi', icon: Wand },
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
            <SidebarGroupLabel>Strumenti</SidebarGroupLabel>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        onClick={() => handleViewChange('importa')}
                        isActive={activeView === 'importa'}
                        tooltip="Importa Contenuti"
                    >
                        <FileUp />
                        <span>Importa Contenuti</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                    <SidebarMenuButton
                        onClick={() => handleViewChange('layout-sperimentale')}
                        isActive={activeView === 'layout-sperimentale'}
                        tooltip="Genera Carte Complete"
                    >
                        <LayoutGrid />
                        <span>Genera Carte Complete</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                    <SidebarMenuButton
                        onClick={() => handleViewChange('crea-carte')}
                        isActive={activeView === 'crea-carte'}
                        tooltip="Crea Carte (Multiplo)"
                    >
                        <Beaker />
                        <span>Crea Carte (Multiplo)</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                    <SidebarMenuButton
                        onClick={() => handleViewChange('personalizza')}
                        isActive={activeView === 'personalizza'}
                        tooltip="Personalizza Sfondo Carte"
                    >
                        <Palette />
                        <span>Personalizza Sfondo</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                    <SidebarMenuButton
                        onClick={() => handleViewChange('mappe')}
                        isActive={activeView === 'mappe'}
                        tooltip="Mappe"
                    >
                        <Map />
                        <span>Mappe</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarSeparator className="my-1" />

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
      <SidebarFooter>
      </SidebarFooter>
    </Sidebar>
  );
}
