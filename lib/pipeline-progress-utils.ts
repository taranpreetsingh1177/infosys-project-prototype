import {
  PIPELINE_STEP_IDS,
  type PipelineStepId,
} from "@/lib/pipeline-steps";
import type { PipelineProgress } from "@/lib/types/session";

function stepsBefore(stepId: PipelineStepId): PipelineStepId[] {
  const index = PIPELINE_STEP_IDS.indexOf(stepId);
  if (index <= 0) return [];
  return PIPELINE_STEP_IDS.slice(0, index);
}

function stepsThrough(stepId: PipelineStepId): PipelineStepId[] {
  const index = PIPELINE_STEP_IDS.indexOf(stepId);
  if (index < 0) return [];
  return PIPELINE_STEP_IDS.slice(0, index + 1);
}

function orderedCompletedSteps(stepIds: Iterable<string>): PipelineStepId[] {
  const set = new Set(stepIds);
  return PIPELINE_STEP_IDS.filter((id) => set.has(id));
}

/** Ensure completed_steps reflects pipeline order and implied progress from current_step. */
export function normalizePipelineProgress(
  progress: PipelineProgress,
): PipelineProgress {
  const completed = new Set(progress.completed_steps);

  if (progress.current_step) {
    for (const id of stepsBefore(progress.current_step as PipelineStepId)) {
      completed.add(id);
    }
  }

  if (progress.failed_step) {
    for (const id of stepsBefore(progress.failed_step as PipelineStepId)) {
      completed.add(id);
    }
  }

  return {
    ...progress,
    completed_steps: orderedCompletedSteps(completed),
  };
}

/** Merge stream/poll updates so progress never regresses. */
export function mergePipelineProgress(
  existing: PipelineProgress | undefined,
  incoming: PipelineProgress,
): PipelineProgress {
  const merged: PipelineProgress = {
    current_step: incoming.current_step,
    completed_steps: orderedCompletedSteps([
      ...(existing?.completed_steps ?? []),
      ...incoming.completed_steps,
    ]),
    failed_step: incoming.failed_step ?? existing?.failed_step,
    error_message: incoming.error_message ?? existing?.error_message,
  };

  return normalizePipelineProgress(merged);
}

export function completedStepsForStepStart(
  previous: PipelineProgress,
  stepId: PipelineStepId,
): PipelineStepId[] {
  return orderedCompletedSteps([
    ...previous.completed_steps,
    ...stepsBefore(stepId),
  ]);
}

export function completedStepsForStepComplete(
  previous: PipelineProgress,
  stepId: PipelineStepId,
): PipelineStepId[] {
  return orderedCompletedSteps([
    ...previous.completed_steps,
    ...stepsThrough(stepId),
  ]);
}
