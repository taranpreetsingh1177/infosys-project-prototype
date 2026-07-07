"use client";

import { InsightsPanel } from "@/components/clinical/insights-panel";
import { SessionHeader } from "@/components/clinical/session-header";
import { SessionProcessingTimeline } from "@/components/clinical/session-processing-timeline";
import { SessionWorkspaceSkeleton } from "@/components/clinical/session-workspace-skeleton";
import { SoapNoteEditor } from "@/components/clinical/soap-note-editor";
import { TranscriptSheet } from "@/components/clinical/transcript-sheet";
import { CitationProvider } from "@/hooks/use-citation-link";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

interface SessionWorkspaceProps {
  sessionId: string;
}

function isProcessingStatus(status: string | undefined) {
  return status === "pending" || status === "processing";
}

export function SessionWorkspace({ sessionId }: SessionWorkspaceProps) {
  const { session, isLoading } = useSession(sessionId);

  // Session data hasn't resolved yet — show a neutral skeleton rather than
  // assuming the session is still processing. Without this, completed
  // sessions would flash the pipeline timeline for a moment before the real
  // dashboard loads in.
  if (!session && isLoading) {
    return <SessionWorkspaceSkeleton />;
  }

  if (
    !session ||
    isProcessingStatus(session.status) ||
    session.status === "error" ||
    session.status === "cancelled"
  ) {
    return (
      <SessionProcessingTimeline
        status={session?.status ?? "processing"}
        progress={session?.pipeline_progress}
        patientId={session?.patient_id ?? ""}
        patientName={session?.patient_name ?? "Patient"}
      />
    );
  }

  return (
    <CitationProvider sourceLines={session.source_lines}>
      <div
        className={cn(
          "flex h-svh flex-col overflow-hidden",
          "animate-in fade-in duration-500",
        )}
      >
        <SessionHeader
          patientId={session.patient_id}
          patientName={session.patient_name}
          visitDate={session.visit_date}
        />
        <div className="flex min-h-0 flex-1 flex-col overflow-auto">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-6">
            <InsightsPanel
              insights={session.insights}
              patientMemory={session.patient_memory}
            />
            <SoapNoteEditor
              patientName={session.patient_name}
              sections={session.soap}
            />
          </div>
        </div>
        <TranscriptSheet lines={session.source_lines} />
      </div>
    </CitationProvider>
  );
}
