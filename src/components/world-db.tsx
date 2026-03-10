import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CampaignWithRelations } from '@/lib/types';
import { BrainCircuit, Library } from 'lucide-react';
import { Button } from './ui/button';

type WorldDbProps = {
  campaign: CampaignWithRelations;
  onSummarize: () => Promise<void>;
  isSummarizing: boolean;
};

export function WorldDb({ campaign, onSummarize, isSummarizing }: WorldDbProps) {
  const renderContent = (content: string) => (
    <div className="whitespace-pre-wrap text-sm text-muted-foreground prose prose-invert prose-p:my-2 prose-ul:my-2 prose-li:my-1 max-h-[40vh] overflow-y-auto">
      {content}
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center text-2xl">
            <BrainCircuit className="mr-2" /> Memoria dell'IA
          </CardTitle>
          <CardDescription>
            Usa l'IA per creare un riassunto della campagna. Questo riassunto sarà la "memoria" dell'IA per generare le sessioni future, risparmiando token.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <Button onClick={onSummarize} disabled={isSummarizing} className="w-full">
            {isSummarizing ? (
              <>
                <Library className="mr-2 h-4 w-4 animate-spin" />
                Creazione riassunto...
              </>
            ) : (
              <>
                <Library className="mr-2 h-4 w-4" />
                Crea/Aggiorna Sommario IA
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {campaign.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline flex items-center text-xl">
              <Library className="mr-2" /> Sommario Attuale della Campagna
            </CardTitle>
            <CardDescription>
              Questa è la memoria a lungo termine dell'IA.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderContent(campaign.summary)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
