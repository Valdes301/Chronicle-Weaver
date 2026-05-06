
'use client';

import { useState, useEffect, type ChangeEvent, type FC, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from '@/lib/types';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollText, Upload, Pencil, Trash2, Trophy, Expand, GripVertical, Search, Cog } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

const EditableXpInput: FC<{ 
  sessionId: string;
  initialXp: number | null;
  onUpdate: (sessionId: string, newXp: number) => Promise<void>;
}> = ({ sessionId, initialXp, onUpdate }) => {
  const [xp, setXp] = useState(initialXp || 0);

  useEffect(() => {
    setXp(initialXp || 0);
  }, [initialXp]);

  const handleBlur = () => {
    const initialValue = initialXp || 0;
    if (xp !== initialValue) {
      onUpdate(sessionId, xp);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <div className="relative flex items-center">
      <Trophy className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="number"
        value={xp}
        onChange={(e) => setXp(Number(e.target.value) || 0)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="h-8 w-24 pl-7 pr-1 text-center font-semibold bg-background/50"
        aria-label="Punti Esperienza"
      />
    </div>
  );
};


// Helper component to correctly use useSortable hook
const SortableSessionItem: FC<{ 
  session: Session,
  getBadgeVariant: (source: Session['source']) => 'default' | 'secondary' | 'outline',
  startEditingContent: (session: Session) => void,
  cancelEditingContent: () => void,
  handleSaveNotes: (sessionId: string) => Promise<void>,
  editingContentId: string | null,
  newNotes: string,
  setNewNotes: (notes: string) => void,
  setEditingTitleSession: (session: Session) => void,
  setDeleteCandidateId: (id: string) => void,
  onUpdateSessionXp: (sessionId: string, xp: number) => Promise<void>,
  onToggleSessionRead: (sessionId: string) => void,
}> = ({ 
  session, 
  getBadgeVariant, 
  startEditingContent,
  cancelEditingContent,
  handleSaveNotes,
  editingContentId, 
  newNotes,
  setNewNotes,
  setEditingTitleSession,
  setDeleteCandidateId,
  onUpdateSessionXp,
  onToggleSessionRead,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: session.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border bg-card transition-shadow",
        isDragging ? "z-10 shadow-xl" : "shadow-sm",
      )}
    >
      <AccordionItem value={session.id} className="border-b-0">
         <div className={cn("flex flex-col p-4 transition-opacity", session.is_read ? 'opacity-60 hover:opacity-100' : 'opacity-100')}>
            <div className="flex-grow w-full text-center">
                <h4 className="font-headline text-lg break-words">{session.title}</h4>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-1">
                    <span>Sessione {session.session_number}</span>
                    <Badge variant={getBadgeVariant(session.source)} className="capitalize">{session.source === 'generated' ? 'Generata' : 'Importata'}</Badge>
                </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                 <div className="flex items-center gap-2">
                    <div {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground p-2 -ml-2">
                        <GripVertical className="h-5 w-5" />
                    </div>
                    <Checkbox
                        id={`read-${session.id}`}
                        aria-label="Segna come letto"
                        checked={session.is_read}
                        onCheckedChange={() => onToggleSessionRead(session.id)}
                        className="h-5 w-5"
                    />
                    <EditableXpInput 
                        sessionId={session.id}
                        initialXp={session.xp_award}
                        onUpdate={onUpdateSessionXp}
                    />
                 </div>

                <div className="flex items-center shrink-0">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Cog className="h-4 w-4" />
                                <span className="sr-only">Opzioni Sessione</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setEditingTitleSession(session)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                <span>Modifica Titolo</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => startEditingContent(session)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                <span>Modifica Contenuto</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => setDeleteCandidateId(session.id)} className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Elimina Sessione</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <AccordionTrigger className="p-2 hover:bg-accent rounded-md [&[data-state=open]>svg]:rotate-180" />
                </div>
            </div>
        </div>
          <AccordionContent>
              <div className="relative px-4 pb-4">
                {editingContentId === session.id ? (
                  <div className="space-y-2">
                    <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} className="min-h-[200px]" />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={cancelEditingContent}>Annulla</Button>
                      <Button onClick={() => handleSaveNotes(session.id)}>Salva Note</Button>
                    </div>
                  </div>
                ) : (
                    <div className="relative">
                        <div className="whitespace-pre-wrap break-words p-4 bg-background/50 rounded-md border text-muted-foreground prose prose-invert prose-sm sm:prose-base max-w-none prose-p:my-2">
                            {session.notes}
                        </div>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8 text-muted-foreground/70 hover:text-foreground">
                                    <Expand className="h-4 w-4" />
                                    <span className="sr-only">Schermo Intero</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-none w-screen h-screen sm:w-[95vw] sm:h-[90vh] sm:max-w-[95vw] flex flex-col">
                                <DialogHeader>
                                    <DialogTitle>{session.title || `Sessione ${session.session_number}`}</DialogTitle>
                                    <DialogDescription>Sessione {session.session_number}</DialogDescription>
                                </DialogHeader>
                                <div className="flex-grow overflow-y-auto -mr-4 pr-4">
                                    <div className="whitespace-pre-wrap break-words prose prose-invert prose-sm sm:prose-base max-w-none">
                                        {session.notes}
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}
              </div>
          </AccordionContent>
      </AccordionItem>
    </div>
  );
}


type SessionTimelineProps = {
  sessions: Session[];
  onImportSession: (notes: string, title: string) => void;
  onUpdateSessionTitle: (sessionId: string, newTitle: string) => Promise<void>;
  onUpdateSessionNotes: (sessionId: string, newNotes: string) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onReorderSessions: (orderedIds: string[]) => Promise<void>;
  onUpdateSessionXp: (sessionId: string, newXp: number) => Promise<void>;
  onToggleSessionRead: (sessionId: string) => void;
};

export function SessionTimeline({ 
    sessions, 
    onImportSession, 
    onUpdateSessionTitle, 
    onUpdateSessionNotes, 
    onDeleteSession, 
    onReorderSessions,
    onUpdateSessionXp,
    onToggleSessionRead
}: SessionTimelineProps) {
  const [importNotes, setImportNotes] = useState('');
  const [importTitle, setImportTitle] = useState('');
  const [isImportDialogOpen, setImportDialogOpen] = useState(false);

  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [newNotes, setNewNotes] = useState('');
  
  const [editingTitleSession, setEditingTitleSession] = useState<Session | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // State to manage the order of session IDs for dnd-kit
  const [orderedSessionIds, setOrderedSessionIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync the ordered IDs when the sessions prop changes
  useEffect(() => {
    setOrderedSessionIds(sessions.map(s => s.id).reverse());
  }, [sessions]);

  // Create a map for quick lookups. This improves performance.
  const sessionsMap = useMemo(() => new Map(sessions.map(s => [s.id, s])), [sessions]);

  // Derive the sessions to display from the ordered IDs
  const displayedSessions = useMemo(() => 
    orderedSessionIds.map(id => sessionsMap.get(id)).filter(Boolean) as Session[],
    [orderedSessionIds, sessionsMap]
  );

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (editingTitleSession) {
      setNewTitle(editingTitleSession.title);
    }
  }, [editingTitleSession]);

  const filteredDisplayedSessions = useMemo(() => {
    if (!searchQuery) {
        return displayedSessions;
    }
    const lowerCaseSearch = searchQuery.toLowerCase();
    return displayedSessions.filter(session => 
        session.title.toLowerCase().includes(lowerCaseSearch) ||
        (session.notes?.toLowerCase() ?? '').includes(lowerCaseSearch)
    );
  }, [displayedSessions, searchQuery]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require an 8px drag to start
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
        const oldIndex = orderedSessionIds.indexOf(active.id as string);
        const newIndex = orderedSessionIds.indexOf(over.id as string);
        
        const newOrderedIds = arrayMove(orderedSessionIds, oldIndex, newIndex);
        setOrderedSessionIds(newOrderedIds);

        const idsInAscendingOrder = [...newOrderedIds].reverse();
        await onReorderSessions(idsInAscendingOrder);
    }
  };


  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportTitle(file.name.replace(/\.[^/.]+$/, ''));
    if (file.type === 'text/plain') {
      const text = await file.text();
      setImportNotes(text);
    } else {
      console.warn('Unsupported file type:', file.type);
      setImportNotes(`File non supportato: ${file.name}. Per favore usa un file .txt.`);
    }
  };

  const handleImport = () => {
    if (importNotes.trim()) {
      onImportSession(importNotes, importTitle);
      setImportNotes('');
      setImportTitle('');
      setImportDialogOpen(false);
    }
  };

  const startEditingContent = (session: Session) => {
    setEditingContentId(session.id);
    setNewNotes(session.notes ?? '');
  };

  const cancelEditingContent = () => {
    setEditingContentId(null);
    setNewNotes('');
  };
  
  const handleSaveNotes = async (sessionId: string) => {
    if (newNotes.trim() && sessionId) {
      await onUpdateSessionNotes(sessionId, newNotes);
      cancelEditingContent();
    }
  };

  const handleSaveNewTitle = async () => {
    if (editingTitleSession && newTitle.trim()) {
      const sessionId = editingTitleSession.id;
      const titleToSave = newTitle;
      
      // Close the dialog first to prevent UI conflicts
      setEditingTitleSession(null);
      setNewTitle('');
      
      // Then call the update function
      await onUpdateSessionTitle(sessionId, titleToSave);
    }
  };

  const confirmDelete = async () => {
    if (deleteCandidateId) {
      await onDeleteSession(deleteCandidateId);
      setDeleteCandidateId(null);
    }
  };

  const getBadgeVariant = (source: Session['source']) => {
    switch (source) {
      case 'generated': return 'default';
      case 'imported': return 'secondary';
      default: return 'outline';
    }
  };
  
  const timelineContent = sessions.length > 0 ? (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={orderedSessionIds} strategy={verticalListSortingStrategy}>
            <Accordion type="single" collapsible className="w-full space-y-2">
                {filteredDisplayedSessions.map((session) => (
                  <SortableSessionItem
                    key={session.id}
                    session={session}
                    getBadgeVariant={getBadgeVariant}
                    editingContentId={editingContentId}
                    startEditingContent={startEditingContent}
                    cancelEditingContent={cancelEditingContent}
                    handleSaveNotes={handleSaveNotes}
                    newNotes={newNotes}
                    setNewNotes={setNewNotes}
                    setEditingTitleSession={setEditingTitleSession}
                    setDeleteCandidateId={setDeleteCandidateId}
                    onUpdateSessionXp={onUpdateSessionXp}
                    onToggleSessionRead={onToggleSessionRead}
                  />
                ))}
            </Accordion>
        </SortableContext>
    </DndContext>
  ) : (
    <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
      <ScrollText className="mx-auto h-12 w-12" />
      <p className="mt-4 font-semibold">La tua avventura deve ancora iniziare.</p>
      <p className="text-sm">Genera o importa la tua prima sessione per iniziare!</p>
    </div>
  );

  if (!isClient) {
    return (
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="font-headline flex items-center text-2xl">
              <ScrollText className="mr-2" /> Cronologia della Storia
            </CardTitle>
            <CardDescription>La cronologia completa della tua campagna.</CardDescription>
          </div>
          <div className="flex items-center gap-2 mt-4 sm:mt-0">
            <Skeleton className="h-10 w-[150px]" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full">
        <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="font-headline flex items-center text-2xl">
              <ScrollText className="mr-2" /> Cronologia della Storia
            </CardTitle>
            <CardDescription>La cronologia completa della tua campagna. Puoi trascinare le sessioni per riordinarle.</CardDescription>
          </div>
          <div className="flex items-center gap-2 mt-4 sm:mt-0">
            <Dialog open={isImportDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" /> Importa Storia
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-headline text-2xl">Importa Note</DialogTitle>
                  <DialogDescription>Incolla le note o carica un file di testo (.txt).</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Input type="file" accept=".txt" onChange={handleFileChange} className="text-sm" />
                  <Input placeholder="Titolo Sessione (opzionale)" value={importTitle} onChange={(e) => setImportTitle(e.target.value)} />
                  <Textarea placeholder="Incolla qui le tue note o carica un file per popolarle..." className="min-h-[200px] resize-y" value={importNotes} onChange={(e) => setImportNotes(e.target.value)} />
                </div>
                <DialogFooter>
                  <Button onClick={handleImport}>Importa nella Cronologia</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <div className="px-6 pb-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Cerca nella cronologia..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>
        </div>
        <CardContent>
          {timelineContent}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteCandidateId} onOpenChange={(isOpen) => !isOpen && setDeleteCandidateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione è irreversibile. La sessione verrà eliminata definitivamente dalla cronologia della tua campagna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteCandidateId(null)}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className={buttonVariants({ variant: "destructive" })}>Sì, elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editingTitleSession} onOpenChange={(isOpen) => !isOpen && setEditingTitleSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Titolo Sessione</DialogTitle>
            <DialogDescription>
              Aggiorna il titolo per questa sessione della cronologia.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="session-title-input" className="text-right">
                Titolo
              </Label>
              <Input
                id="session-title-input"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEditingTitleSession(null)}>Annulla</Button>
            <Button type="submit" onClick={handleSaveNewTitle}>Salva Modifiche</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

    



    
