import {
  InferAgentUIMessage,
  ToolLoopAgent,
  type ToolApprovalStatus,
} from "ai";
import { z } from "zod";

import { clinicalAssistantModel } from "@/lib/ai";
import { getSession } from "@/lib/db";
import { askClarifyingQuestion } from "@/lib/agents/tools/askClarifyingQuestion";
import { getPatientMemory } from "@/lib/agents/tools/getPatientMemory";
import { getSessionSummary } from "@/lib/agents/tools/getSessionSummary";
import { listDocuments } from "@/lib/agents/tools/listDocuments";
import { listPatients } from "@/lib/agents/tools/listPatients";
import { readDocument } from "@/lib/agents/tools/readDocument";
import { searchSessions } from "@/lib/agents/tools/searchSessions";

const callOptionsSchema = z.object({
  pinnedPatientId: z.string().optional(),
});

export type ClinicalAssistantCallOptions = z.infer<typeof callOptionsSchema>;

export type ClinicalAssistantRuntimeContext = {
  pinnedPatientId?: string;
};

const BASE_INSTRUCTIONS = `You are a clinical workspace assistant for a single-clinician prototype.

Help the doctor find patients, review session SOAP summaries, patient memory, and uploaded documents.

Rules:
- Prefer tools over guessing. Use listPatients / searchSessions before loading PHI-heavy summaries.
- When a patient is pinned in chat context, prefer that patient for lookups.
- Use askClarifyingQuestion when the request is ambiguous (which patient, which visit, etc.).
- Never invent clinical facts. If a tool returns nothing, say so.
- When a tool execution is not approved, do not retry the same tool call; acknowledge the denial and offer alternatives.
- Keep answers concise and clinically useful. Use markdown sparingly (short headings, bullets).`;

function buildInstructions(pinnedPatientId?: string) {
  if (!pinnedPatientId) return BASE_INSTRUCTIONS;
  return `${BASE_INSTRUCTIONS}

Pinned patient ID for this chat: ${pinnedPatientId}.
Treat this as the default patient focus. Same-patient session summaries and memory do not require approval; document full text still does.`;
}

async function isPinnedPatient(
  patientId: string | undefined,
  runtimeContext: ClinicalAssistantRuntimeContext | undefined,
): Promise<boolean> {
  const pinned = runtimeContext?.pinnedPatientId;
  return Boolean(pinned && patientId && pinned === patientId);
}

export const clinicalAssistant = new ToolLoopAgent<
  ClinicalAssistantCallOptions,
  {
    listPatients: typeof listPatients;
    searchSessions: typeof searchSessions;
    getSessionSummary: typeof getSessionSummary;
    getPatientMemory: typeof getPatientMemory;
    listDocuments: typeof listDocuments;
    readDocument: typeof readDocument;
    askClarifyingQuestion: typeof askClarifyingQuestion;
  },
  ClinicalAssistantRuntimeContext
>({
  id: "clinical-assistant",
  model: clinicalAssistantModel,
  // OpenAI Responses: top-level reasoning maps to effort; summary text is what
  // the UI streams as ReasoningUIPart (requires an API model that emits summaries).
  reasoning: "medium",
  providerOptions: {
    openai: {
      // `auto` reliably streams summary text; `detailed` often yields empty
      // reasoning-start/end pairs with no deltas for short tool-first turns.
      reasoningSummary: "auto",
    },
  },
  instructions: BASE_INSTRUCTIONS,
  callOptionsSchema,
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    runtimeContext: {
      pinnedPatientId: options.pinnedPatientId,
    },
    instructions: buildInstructions(options.pinnedPatientId),
  }),
  tools: {
    listPatients,
    searchSessions,
    getSessionSummary,
    getPatientMemory,
    listDocuments,
    readDocument,
    askClarifyingQuestion,
  },
  toolApproval: {
    // Full document text always needs explicit approval.
    readDocument: "user-approval",
    // Session summaries: free when the session belongs to the pinned patient.
    getSessionSummary: async (
      { sessionId },
      { runtimeContext },
    ): Promise<ToolApprovalStatus> => {
      const session = await getSession(sessionId);
      if (
        await isPinnedPatient(session?.patient_id, runtimeContext)
      ) {
        return "not-applicable";
      }
      return "user-approval";
    },
    // Memory: free when requesting the pinned patient.
    getPatientMemory: async (
      { patientId },
      { runtimeContext },
    ): Promise<ToolApprovalStatus> => {
      if (await isPinnedPatient(patientId, runtimeContext)) {
        return "not-applicable";
      }
      return "user-approval";
    },
  },
});

export type ClinicalAssistantUIMessage = InferAgentUIMessage<
  typeof clinicalAssistant
>;
