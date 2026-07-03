"use client";

import { useEffect, useState } from "react";

import { InsightsPanel } from "@/components/clinical/insights-panel";
import { SessionHeader } from "@/components/clinical/session-header";
import { SessionProcessingTimeline } from "@/components/clinical/session-processing-timeline";
import { SoapNoteEditor } from "@/components/clinical/soap-note-editor";
import { TranscriptSheet } from "@/components/clinical/transcript-sheet";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [showWorkspace, setShowWorkspace] = useState(false);

  useEffect(() => {
    if (!session) return;

    if (isProcessingStatus(session.status) || session.status === "error") {
      setShowWorkspace(false);
      return;
    }

    if (session.status === "complete") {
      const timer = setTimeout(() => setShowWorkspace(true), 400);
      return () => clearTimeout(timer);
    }
  }, [session]);

  if (isLoading || !session) {
    return <SessionWorkspaceSkeleton />;
  }

  if (!showWorkspace) {
    if (isProcessingStatus(session.status) || session.status === "error") {
      return (
        <SessionProcessingTimeline
          status={session.status}
          progress={session.pipeline_progress}
          patientId={session.patient_id}
          patientName={session.patient_name}
        />
      );
    }

    return <SessionWorkspaceSkeleton />;
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
            <InsightsPanel insights={session.insights} />
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

function SessionWorkspaceSkeleton() {
  return (
    <div className="flex h-svh flex-col">
      <Skeleton className="h-12 w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-6 w-64" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
