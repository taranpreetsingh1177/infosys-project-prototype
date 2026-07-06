import { getSession, updateSession } from "@/lib/db";
import { normalizePipelineProgress } from "@/lib/pipeline-progress-utils";
import type { PipelineStepId } from "@/lib/pipeline-steps";
import type { PipelineProgress } from "@/lib/types/session";

export async function persistSessionFailure(
  sessionId: string,
  failedStep: PipelineStepId | null,
  errorMessage: string,
): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) return;

  if (
    session.status === "completed" ||
    session.status === "failed" ||
    session.status === "cancelled"
  ) {
    return;
  }

  const previous: PipelineProgress =
    session.agent_metadata?.pipeline_progress ?? {
      current_step: null,
      completed_steps: [],
    };

  const progress = normalizePipelineProgress({
    ...previous,
    current_step: null,
    failed_step: failedStep ?? previous.failed_step ?? null,
    error_message: errorMessage,
  });

  await updateSession(sessionId, {
    status: "failed",
    agent_metadata: {
      ...session.agent_metadata,
      edit_log: session.agent_metadata?.edit_log ?? [],
      patient_memory: session.agent_metadata?.patient_memory,
      symptom_recurrence: session.agent_metadata?.symptom_recurrence,
      pipeline_progress: progress,
    },
  });
}

export async function persistSessionCancelled(
  sessionId: string,
  failedStep: PipelineStepId | null,
  errorMessage: string,
): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) return;

  if (
    session.status === "completed" ||
    session.status === "failed" ||
    session.status === "cancelled"
  ) {
    return;
  }

  const previous: PipelineProgress =
    session.agent_metadata?.pipeline_progress ?? {
      current_step: null,
      completed_steps: [],
    };

  const progress = normalizePipelineProgress({
    ...previous,
    current_step: null,
    failed_step:
      failedStep ?? previous.current_step ?? previous.failed_step ?? null,
    error_message: errorMessage,
  });

  await updateSession(sessionId, {
    status: "cancelled",
    agent_metadata: {
      ...session.agent_metadata,
      edit_log: session.agent_metadata?.edit_log ?? [],
      patient_memory: session.agent_metadata?.patient_memory,
      symptom_recurrence: session.agent_metadata?.symptom_recurrence,
      pipeline_progress: progress,
    },
  });
}
