"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { sessionDetailToUi } from "@/lib/adapters/session-to-ui";
import type { SessionDetailWithPatient } from "@/lib/adapters/session-to-ui";
import { RAJESH_SHARMA_SESSION } from "@/lib/mock/rajesh-sharma-session";
import { mergePipelineProgress } from "@/lib/pipeline-progress-utils";
import type { PipelineStreamEvent } from "@/lib/pipeline-stream";
import type { SessionStatus, SessionView } from "@/lib/types/session";

const FALLBACK_POLL_MS = 1500;

function getMockSession(id: string): SessionView {
  if (id === "demo") return RAJESH_SHARMA_SESSION;
  return { ...RAJESH_SHARMA_SESSION, id };
}

async function fetchSession(id: string): Promise<SessionView | null> {
  try {
    const response = await fetch(`/api/sessions/${id}`);
    if (!response.ok) return null;
    const detail = (await response.json()) as SessionDetailWithPatient;
    return sessionDetailToUi(detail);
  } catch {
    return null;
  }
}

function isProcessingStatus(status: SessionStatus | undefined) {
  return status === "pending" || status === "processing";
}

function applyStreamEvent(
  session: SessionView,
  event: PipelineStreamEvent,
): SessionView {
  const nextStatus =
    event.status === "complete"
      ? "complete"
      : event.status === "error"
        ? "error"
        : session.status;

  return {
    ...session,
    status: nextStatus,
    pipeline_progress: mergePipelineProgress(
      session.pipeline_progress,
      event.progress,
    ),
  };
}

function mergeSessionProgress(
  existing: SessionView,
  incoming: SessionView,
): SessionView {
  if (!incoming.pipeline_progress) return incoming;

  return {
    ...incoming,
    pipeline_progress: mergePipelineProgress(
      existing.pipeline_progress,
      incoming.pipeline_progress,
    ),
  };
}

export function useSession(id: string) {
  const [session, setSession] = useState<SessionView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const reloadSession = useCallback(async () => {
    const data = await fetchSession(id);
    if (!data) return null;
    setSession(data);
    setUsingMock(false);
    return data;
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | undefined;

    const stopPolling = () => {
      if (pollId) {
        clearInterval(pollId);
        pollId = undefined;
      }
    };

    const closeStream = () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };

    const startFallbackPoll = () => {
      if (pollId) return;
      pollId = setInterval(async () => {
        const data = await fetchSession(id);
        if (cancelled || !data) return;
        setSession((current) =>
          current ? mergeSessionProgress(current, data) : data,
        );
        if (!isProcessingStatus(data.status)) {
          stopPolling();
          closeStream();
        }
      }, FALLBACK_POLL_MS);
    };

    const connectProgressStream = () => {
      closeStream();
      const source = new EventSource(`/api/sessions/${id}/progress`);
      eventSourceRef.current = source;

      source.onmessage = (message) => {
        if (cancelled) return;

        let event: PipelineStreamEvent;
        try {
          event = JSON.parse(message.data) as PipelineStreamEvent;
        } catch {
          return;
        }

        setSession((current) =>
          current ? applyStreamEvent(current, event) : current,
        );

        if (event.type === "done" || event.type === "failed") {
          closeStream();
          stopPolling();
          void reloadSession();
        }
      };

      source.onerror = () => {
        closeStream();
        startFallbackPoll();
      };
    };

    const init = async () => {
      const data = await fetchSession(id);
      if (cancelled) return;

      if (data) {
        setSession(data);
        setUsingMock(false);
        setIsLoading(false);

        if (isProcessingStatus(data.status)) {
          connectProgressStream();
        }
        return;
      }

      setSession(getMockSession(id));
      setUsingMock(true);
      setIsLoading(false);
    };

    void init();

    return () => {
      cancelled = true;
      stopPolling();
      closeStream();
    };
  }, [id, reloadSession]);

  return { session, isLoading, usingMock };
}
