import { generateObject } from "ai";
import { z } from "zod";
import { buildUpdatePatientMemoryPrompt } from "@/agent/prompts";
import { clinicalScribeModel } from "@/lib/ai";
import {
  createPatientMemoryVersion,
  getFindings,
  getLatestPatientMemory,
  getPatientMemoryBySourceSession,
  getSession,
  updateSession,
} from "@/lib/db";
import {
  buildPriorMemorySummary,
  buildSessionFindingsSummary,
  buildSoapSummary,
  toPatientMemorySnapshot,
} from "@/lib/memory";
import { buildPatientDocumentsPromptSummary } from "@/lib/patient-documents";
import { PatientMemoryUpdateLlmSchema } from "@/lib/schema";

function isRetryableAiError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("rate limit") ||
    message.includes("timeout") ||
    message.includes("overloaded") ||
    message.includes("503") ||
    message.includes("502") ||
    message.includes("429")
  );
}

export async function updatePatientMemoryExecute(input: {
  sessionId: string;
}): Promise<{ memory_id: string; version: number }> {
  "use step";

  const session = await getSession(input.sessionId);
  if (!session?.soap) {
    throw new Error(`Session ${input.sessionId} has no SOAP note for memory update.`);
  }

  const existingMemory = await getPatientMemoryBySourceSession(input.sessionId);
  if (existingMemory) {
    return {
      memory_id: existingMemory.memory_id,
      version: existingMemory.version,
    };
  }

  const findings = await getFindings(input.sessionId);
  const priorMemoryVersion = await getLatestPatientMemory(
    session.patient_id,
    input.sessionId,
  );
  const priorMemory =
    session.agent_metadata?.patient_memory ??
    (priorMemoryVersion ? toPatientMemorySnapshot(priorMemoryVersion) : null);
  const patientDocumentsSummary = buildPatientDocumentsPromptSummary(
    session.agent_metadata?.patient_documents ?? [],
  );

  const defaultDerivedSessionIds = [
    ...new Set([
      ...(priorMemoryVersion?.derived_from_session_ids ?? []),
      input.sessionId,
    ]),
  ];

  let object;
  try {
    ({ object } = await generateObject({
      model: clinicalScribeModel,
      schema: PatientMemoryUpdateLlmSchema,
      prompt: buildUpdatePatientMemoryPrompt({
        priorMemorySummary: buildPriorMemorySummary(priorMemory),
        findingsSummary: buildSessionFindingsSummary(findings),
        soapSummary: buildSoapSummary(session.soap),
        sessionId: input.sessionId,
        patientDocumentsSummary,
      }),
    }));
  } catch (error) {
    if (isRetryableAiError(error)) {
      const { RetryableError } = await import("workflow");
      throw new RetryableError(
        error instanceof Error ? error.message : "Patient memory generation failed",
      );
    }
    throw error;
  }

  const memory = await createPatientMemoryVersion({
    patientId: session.patient_id,
    sourceSessionId: input.sessionId,
    summary: object.summary,
    structured: object.structured,
    derivedFromSessionIds:
      object.derived_from_session_ids.length > 0
        ? object.derived_from_session_ids
        : defaultDerivedSessionIds,
  });

  await updateSession(input.sessionId, {
    agent_metadata: {
      ...session.agent_metadata,
      edit_log: session.agent_metadata?.edit_log ?? [],
      patient_memory: session.agent_metadata?.patient_memory,
      symptom_recurrence: session.agent_metadata?.symptom_recurrence,
      patient_documents: session.agent_metadata?.patient_documents,
      created_memory_id: memory.memory_id,
    },
  });

  return { memory_id: memory.memory_id, version: memory.version };
}

export const updatePatientMemoryTool = {
  description: "Merge the current session into a new versioned patient memory record.",
  inputSchema: z.object({
    sessionId: z.string(),
  }),
  execute: updatePatientMemoryExecute,
};
