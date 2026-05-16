
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Wand2, Upload, ChevronLeft, Loader2 } from 'lucide-react';
import { Icons } from './icons';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';
import { Separator } from './ui/separator';

const campaignFormSchema = z.object({
  name: z.string().min(3, 'Il nome della campagna deve contenere almeno 3 caratteri.'),
  setting: z.string().min(3, "L'ambientazione deve contenere almeno 3 caratteri."),
  description: z.string().optional().nullable(),
});

type CampaignInitializerProps = {
  onCreateCampaign: (data: z.infer<typeof campaignFormSchema>) => Promise<void>;
  onCancel?: () => void;
};

const CreateCampaignDialog = ({ onCreateCampaign }: { onCreateCampaign: (data: z.infer<typeof campaignFormSchema>) => Promise<void> }) => {
  const campaignForm = useForm<z.infer<typeof campaignFormSchema>>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: { name: '', setting: '', description: '' },
  });
  const [isOpen, setIsOpen] = useState(false);

  const onCampaignSubmit = async (values: z.infer<typeof campaignFormSchema>) => {
    try {
        await onCreateCampaign(values);
        campaignForm.reset();
        setIsOpen(false);
    } catch (e) {
        // L'errore viene gestito dal manager tramite toast
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="shadow-lg shadow-primary/20 w-full sm:w-auto h-12 text-lg">
          <Wand2 className="mr-2 h-5 w-5" />
          Crea Nuova Campagna
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] w-[95vw] max-h-[95vh] flex flex-col p-0 overflow-hidden outline-none rounded-2xl border-primary/20">
        <DialogHeader className="p-6 pb-2 border-b bg-muted/10 shrink-0">
          <DialogTitle className="font-headline text-2xl">Nuova Campagna</DialogTitle>
          <DialogDescription>
            Raccontaci del tuo nuovo mondo. L'IA genererà alcuni punti di partenza per te.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
            <Form {...campaignForm}>
                <form id="new-campaign-form" onSubmit={campaignForm.handleSubmit(onCampaignSubmit)} className="space-y-4">
                    <FormField control={campaignForm.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Nome della Campagna</FormLabel><FormControl><Input placeholder="es., L'Ombra di Dragonspire" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={campaignForm.control} name="setting" render={({ field }) => (
                        <FormItem><FormLabel>Ambientazione</FormLabel><FormControl><Input placeholder="es., Forgotten Realms, Eberron..." {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={campaignForm.control} name="description" render={({ field }) => (
                        <FormItem><FormLabel>Breve Descrizione (Opzionale)</FormLabel><FormControl>
                            <Textarea placeholder="Il tema centrale o il conflitto della campagna." className="min-h-[120px] resize-none" {...field} value={field.value ?? ''} />
                        </FormControl><FormMessage /></FormItem>
                    )} />
                </form>
            </Form>
        </div>
        <DialogFooter className="p-6 pt-4 border-t bg-muted/20 shrink-0">
            <Button type="submit" form="new-campaign-form" className="w-full h-12 text-lg" disabled={campaignForm.formState.isSubmitting}>
                {campaignForm.formState.isSubmitting ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin"/> Intrecciando la Storia...</>
                ) : 'Crea Campagna'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export function CampaignInitializer({ onCreateCampaign, onCancel }: CampaignInitializerProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => { setIsClient(true); }, []);
  
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-background');

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-background overflow-y-auto overflow-x-hidden">
      {heroImage && (
        <>
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className={cn(
              "object-cover -z-10 brightness-[0.3] scale-105 transition-opacity duration-1000",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setImageLoaded(true)}
            priority
          />
          {!imageLoaded && <Skeleton className="absolute inset-0 -z-10" />}
        </>
      )}

      {onCancel && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onCancel}
          className="absolute top-4 left-4 z-50 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Torna alla Campagna
        </Button>
      )}

      <div className="flex-1 flex flex-col items-center justify-start sm:justify-center p-4 py-16 sm:py-20 text-center mx-auto w-full max-w-4xl min-h-screen">
        <div className="mb-6 animate-fade-in-up shrink-0">
          <Icons.logo className="h-20 w-20 md:h-24 md:w-24 mx-auto text-primary" />
        </div>

        <h1 className="font-headline text-5xl md:text-7xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 leading-tight shrink-0">
          Tessitore di Cronache
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-8 shrink-0 px-4">
          Intreccia la tua saga di Dungeons & Dragons. Lascia che l'IA sia il tuo co-dungeon master, generando mondi, personaggi e spunti per la trama.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center mb-12 shrink-0 w-full sm:w-auto px-6">
          {isClient ? (
            <CreateCampaignDialog onCreateCampaign={onCreateCampaign} />
          ) : (
            <Button size="lg" className="shadow-lg shadow-primary/20 w-full sm:w-auto h-12" disabled>
              <Wand2 className="mr-2 h-5 w-5" />
              Crea Nuova Campagna
            </Button>
          )}
          <div className="flex items-center gap-2">
              <Separator orientation="vertical" className="h-6 hidden sm:block"/>
              <span className="text-muted-foreground hidden sm:block">o</span>
          </div>
           <Button size="lg" variant="outline" asChild className="w-full sm:w-auto h-12 cursor-pointer">
              <label htmlFor="restore-backup-input">
                <Upload className="mr-2 h-5 w-5" />
                Ripristina da Backup
              </label>
          </Button>
        </div>
      </div>
    </div>
  );
}
