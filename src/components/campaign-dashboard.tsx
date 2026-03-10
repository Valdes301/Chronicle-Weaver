import type { CampaignWithRelations, Session } from '@/lib/types';
import { SessionTimeline } from './session-timeline';
import { WorldDb } from './world-db';
import { GenerationPanel } from './generate-session-dialog';

type CampaignDashboardProps = {
  campaign: CampaignWithRelations;
  sessions: Session[];
  onGenerate: (prompt: string, modification?: { storyToModify: string, request: string }) => Promise<void>;
  onConfirmSession: (session: Session) => void;
  onImportSession: (notes: string, title: string) => void;
  pendingSession: Session | null;
  isGenerating: boolean;
  onPendingSessionChange: (updates: Partial<Pick<Session, 'title' | 'notes' | 'xp_award'>>) => void;
  onSummarizeCampaign: () => Promise<void>;
  isSummarizing: boolean;
  onUpdateSessionTitle: (sessionId: string, title: string) => Promise<void>;
  onUpdateSessionNotes: (sessionId: string, notes: string) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onReorderSessions: (orderedIds: string[]) => Promise<void>;
  onUpdateSessionXp: (sessionId: string, xp: number) => Promise<void>;
  onToggleSessionRead: (sessionId: string) => Promise<void>;
};

export function CampaignDashboard({
  campaign,
  sessions,
  onGenerate,
  onConfirmSession,
  onImportSession,
  pendingSession,
  isGenerating,
  onPendingSessionChange,
  onSummarizeCampaign,
  isSummarizing,
  onUpdateSessionTitle,
  onUpdateSessionNotes,
  onDeleteSession,
  onReorderSessions,
  onUpdateSessionXp,
  onToggleSessionRead,
}: CampaignDashboardProps) {
  
  return (
    <div className="space-y-8">
      <GenerationPanel 
        onGenerate={onGenerate}
        onConfirm={onConfirmSession}
        pendingSession={pendingSession}
        isGenerating={isGenerating}
        onPendingSessionChange={onPendingSessionChange}
      />
      <SessionTimeline 
        sessions={sessions} 
        onImportSession={onImportSession}
        onUpdateSessionTitle={onUpdateSessionTitle}
        onUpdateSessionNotes={onUpdateSessionNotes}
        onDeleteSession={onDeleteSession}
        onReorderSessions={onReorderSessions}
        onUpdateSessionXp={onUpdateSessionXp}
        onToggleSessionRead={onToggleSessionRead}
      />
      <WorldDb
        campaign={campaign}
        onSummarize={onSummarizeCampaign}
        isSummarizing={isSummarizing}
      />
    </div>
  );
}
