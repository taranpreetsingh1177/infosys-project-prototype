import { extractFindingsExecute } from "@/agent/tools/extractFindings";
import { flagCompletenessExecute } from "@/agent/tools/flagCompleteness";
import { generateInsightsExecute } from "@/agent/tools/generateInsights";
import { loadPatientDocumentsExecute } from "@/agent/tools/loadPatientDocuments";
import { loadPatientMemoryExecute } from "@/agent/tools/loadPatientMemory";
import { structureSoapExecute } from "@/agent/tools/structureSoap";
import { updatePatientMemoryExecute } from "@/agent/tools/updatePatientMemory";
import { verifyFindingsExecute } from "@/agent/tools/verifyFindings";
import { writeBackExecute } from "@/agent/tools/writeBack";
import {
  markPipelineStepCompleted,
  markPipelineStepStarted,
} from "@/lib/pipeline-progress";
import {
  PIPELINE_STEP_IDS,
} from "@/lib/pipeline-steps";
import type { RuntimeContext } from "@/lib/schema";

const PIPELINE_STEPS = [
  { id: "extractFindings" as const, execute: extractFindingsExecute },
  { id: "verifyFindings" as const, execute: verifyFindingsExecute },
  { id: "structureSoap" as const, execute: structureSoapExecute },
  { id: "flagCompleteness" as const, execute: flagCompletenessExecute },
  { id: "loadPatientMemory" as const, execute: loadPatientMemoryExecute },
  { id: "loadPatientDocuments" as const, execute: loadPatientDocumentsExecute },
  { id: "generateInsights" as const, execute: generateInsightsExecute },
  { id: "updatePatientMemory" as const, execute: updatePatientMemoryExecute },
  { id: "writeBack" as const, execute: writeBackExecute },
] as const;

export async function runClinicalScribePipeline(
  runtimeContext: RuntimeContext,
): Promise<{ steps: number }> {
  const { sessionId, visitType } = runtimeContext;

  for (const { id, execute } of PIPELINE_STEPS) {
    await markPipelineStepStarted(sessionId, id);

    if (execute === flagCompletenessExecute) {
      await execute({ sessionId, visitType });
    } else {
      await execute({ sessionId });
    }

    await markPipelineStepCompleted(sessionId, id);
  }

  return { steps: PIPELINE_STEP_IDS.length };
}
