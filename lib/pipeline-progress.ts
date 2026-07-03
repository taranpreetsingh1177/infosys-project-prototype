import { getWritable } from "workflow";

import { getSession, updateSession } from "@/lib/db";
import {
  completedStepsForStepComplete,
  completedStepsForStepStart,
  normalizePipelineProgress,
} from "@/lib/pipeline-progress-utils";
import { persistSessionFailure } from "@/lib/session-failure";
import type { PipelineStepId } from "@/lib/pipeline-steps";
import {
  PIPELINE_STREAM_NAMESPACE,
  type PipelineStreamEvent,
} from "@/lib/pipeline-stream";
import type { Session } from "@/lib/schema";
import type { PipelineProgress } from "@/lib/types/session";

type AgentMetadata = NonNullable<Session["agent_metadata"]>;

function defaultProgress(): PipelineProgress {
  return { current_step: null, completed_steps: [] };
}

function withProgress(
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>,
  progress: PipelineProgress,
): AgentMetadata {
  return {
    edit_log: session.agent_metadata?.edit_log ?? [],
    patient_memory: session.agent_metadata?.patient_memory,
    symptom_recurrence: session.agent_metadata?.symptom_recurrence,
    pipeline_progress: progress,
  };
}

async function emitPipelineEvent(event: PipelineStreamEvent): Promise<void> {
  try {
    const writable = getWritable<PipelineStreamEvent>({
      namespace: PIPELINE_STREAM_NAMESPACE,
    });
    const writer = writable.getWriter();
    try {
      await writer.write(event);
    } finally {
      writer.releaseLock();
    }
  } catch {
    // Stream may be unavailable outside workflow steps.
  }
}

export async function closePipelineStream(): Promise<void> {
  "use step";

  try {
    await getWritable<PipelineStreamEvent>({
      namespace: PIPELINE_STREAM_NAMESPACE,
    }).close();
  } catch {
    // Non-fatal if stream is already closed.
  }
}

export async function initPipelineProgress(sessionId: string): Promise<void> {
  "use step";

  const session = await getSession(sessionId);
  if (!session) return;

  const progress = defaultProgress();

  await updateSession(sessionId, {
    agent_metadata: withProgress(session, progress),
  });

  await emitPipelineEvent({
    type: "init",
    progress,
    status: "processing",
  });
}

export async function markPipelineStepStarted(
  sessionId: string,
  stepId: PipelineStepId,
): Promise<void> {
  "use step";

  const session = await getSession(sessionId);
  if (!session) return;

  const previous = normalizePipelineProgress(
    session.agent_metadata?.pipeline_progress ?? defaultProgress(),
  );
  const progress: PipelineProgress = {
    ...previous,
    current_step: stepId,
    completed_steps: completedStepsForStepStart(previous, stepId),
    failed_step: null,
    error_message: null,
  };

  await updateSession(sessionId, {
    agent_metadata: withProgress(session, progress),
  });

  await emitPipelineEvent({
    type: "step_started",
    stepId,
    progress,
    status: "processing",
  });
}

export async function markPipelineStepCompleted(
  sessionId: string,
  stepId: PipelineStepId,
): Promise<void> {
  "use step";

  const session = await getSession(sessionId);
  if (!session) return;

  const previous = normalizePipelineProgress(
    session.agent_metadata?.pipeline_progress ?? defaultProgress(),
  );
  const progress: PipelineProgress = {
    ...previous,
    current_step: null,
    completed_steps: completedStepsForStepComplete(previous, stepId),
  };

  await updateSession(sessionId, {
    agent_metadata: withProgress(session, progress),
  });

  await emitPipelineEvent({
    type: "step_completed",
    stepId,
    progress,
    status: "processing",
  });
}

export async function markPipelineFailed(
  sessionId: string,
  stepId: PipelineStepId | null,
  errorMessage: string,
): Promise<void> {
  "use step";

  const session = await getSession(sessionId);
  if (!session) return;

  await persistSessionFailure(sessionId, stepId, errorMessage);

  const refreshed = await getSession(sessionId);
  const progress =
    refreshed?.agent_metadata?.pipeline_progress ?? defaultProgress();

  await emitPipelineEvent({
    type: "failed",
    stepId,
    errorMessage,
    progress,
    status: "error",
  });
}

export async function emitPipelineDone(sessionId: string): Promise<void> {
  "use step";

  const session = await getSession(sessionId);
  if (!session) return;

  const progress =
    session.agent_metadata?.pipeline_progress ?? defaultProgress();

  await emitPipelineEvent({
    type: "done",
    progress,
    status: "complete",
  });
}
