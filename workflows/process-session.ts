import { runClinicalScribePipeline } from "@/agent/workflow";
import {
  closePipelineStream,
  emitPipelineDone,
  initPipelineProgress,
} from "@/lib/pipeline-progress";
import { getSession } from "@/lib/db";
import {
  persistSessionCancelled,
  persistSessionFailure,
} from "@/lib/session-failure";
import type { PipelineStepId } from "@/lib/pipeline-steps";
import type { RuntimeContext } from "@/lib/schema";
async function markSessionProcessing(sessionId: string) {
  "use step";
  const { updateSession } = await import("@/lib/db");
  await updateSession(sessionId, { status: "processing" });
}

async function failSessionStep(sessionId: string, message: string) {
  "use step";
  const session = await getSession(sessionId);
  const failedStep =
    (session?.agent_metadata?.pipeline_progress?.current_step as
      | PipelineStepId
      | null
      | undefined) ??
    (session?.agent_metadata?.pipeline_progress?.failed_step as
      | PipelineStepId
      | null
      | undefined) ??
    null;
  await persistSessionFailure(sessionId, failedStep, message);
}

export async function processSession(input: {
  sessionId: string;
  visitType: string;
}) {
  "use workflow";

  const runtimeContext: RuntimeContext = {
    sessionId: input.sessionId,
    pipelineStep: 0,
    visitType: input.visitType,
  };

  try {
    await markSessionProcessing(input.sessionId);
    await initPipelineProgress(input.sessionId);
    const result = await runClinicalScribePipeline(runtimeContext);
    await emitPipelineDone(input.sessionId);
    await closePipelineStream();
    return {
      sessionId: input.sessionId,
      status: "completed",
      steps: result.steps,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Pipeline failed";
    const isCancelled =
      message.toLowerCase().includes("cancel") ||
      (error instanceof Error && error.name.toLowerCase().includes("cancel"));
    if (isCancelled) {
      await persistSessionCancelled(input.sessionId, null, "Cancelled by user");
    } else {
      await failSessionStep(input.sessionId, message);
    }
    await closePipelineStream();
    throw error;
  }
}