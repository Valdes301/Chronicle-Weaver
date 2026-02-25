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
import { Wand2, Upload } from 'lucide-react';
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
};

const CreateCampaignDialog = ({ onCreateCampaign }: { onCreateCampaign: (data: z.infer<typeof campaignFormSchema>) => Promise<void> }) => {
  const campaignForm = useForm<z.infer<typeof campaignFormSchema>>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: { name: '', setting: '', description: '' },
  });
  const [isOpen, setIsOpen] = useState(false);

  const onCampaignSubmit = async (values: z.infer<typeof campaignFormSchema>) => {
    await onCreateCampaign(values);
    campaignForm.reset();
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="shadow-lg shadow-primary/20 w-full sm:w-auto">
          <Wand2 className="mr-2 h-5 w-5" />
          Crea Nuova Campagna
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Nuova Campagna</DialogTitle>
          <DialogDescription>
            Raccontaci del tuo nuovo mondo. L'IA genererà alcuni punti di partenza per te.
          </DialogDescription>
        </DialogHeader>
        <Form {...campaignForm}>
          <form onSubmit={campaignForm.handleSubmit(onCampaignSubmit)} className="space-y-4 pt-4">
            <FormField control={campaignForm.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Nome della Campagna</FormLabel><FormControl><Input placeholder="es., L'Ombra di Dragonspire" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={campaignForm.control} name="setting" render={({ field }) => (
              <FormItem><FormLabel>Ambientazione</FormLabel><FormControl><Input placeholder="es., Forgotten Realms, Eberron o un mondo personalizzato" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={campaignForm.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Breve Descrizione (Opzionale)</FormLabel><FormControl>
                <Textarea placeholder="Una breve panoramica del tema centrale o del conflitto della campagna." className="resize-none" {...field} value={field.value ?? ''} />
              </FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <Button type="submit" disabled={campaignForm.formState.isSubmitting}>
                {campaignForm.formState.isSubmitting ? 'Intrecciando...' : 'Crea Campagna'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};


export function CampaignInitializer({ onCreateCampaign }: CampaignInitializerProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-background');

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen text-center p-4 overflow-hidden">
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
            data-ai-hint={heroImage.imageHint}
            priority
          />
          {!imageLoaded && <Skeleton className="absolute inset-0 -z-10" />}
        </>
      )}

      <div className="mb-6 animate-fade-in-up">
        <Icons.logo className="h-20 w-20 md:h-24 md:w-24 mx-auto text-primary" />
      </div>

      <h1 className="font-headline text-5xl md:text-7xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
        Tessitore di Cronache
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-8">
        Intreccia la tua saga di Dungeons & Dragons. Lascia che l'IA sia il tuo co-dungeon master, generando mondi, personaggi e spunti per la trama per dare il via alla tua avventura.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        {isClient ? (
          <CreateCampaignDialog onCreateCampaign={onCreateCampaign} />
        ) : (
          <Button size="lg" className="shadow-lg shadow-primary/20 w-full sm:w-auto" disabled>
            <Wand2 className="mr-2 h-5 w-5" />
            Crea Nuova Campagna
          </Button>
        )}
        <div className="flex items-center gap-2">
            <Separator orientation="vertical" className="h-6 hidden sm:block"/>
            <span className="text-muted-foreground hidden sm:block">o</span>
        </div>
         <Button size="lg" variant="outline" asChild className="w-full sm:w-auto cursor-pointer">
            <label htmlFor="restore-backup-input">
              <Upload className="mr-2 h-5 w-5" />
              Ripristina da Backup
            </label>
        </Button>
      </div>
    </div>
  );
}
