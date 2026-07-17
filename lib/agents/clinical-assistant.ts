import { InferAgentUIMessage, ToolLoopAgent } from "ai";

import { clinicalAssistantModel } from "@/lib/ai";
import { askClarifyingQuestion } from "@/lib/agents/tools/askClarifyingQuestion";
import { getPatientMemory } from "@/lib/agents/tools/getPatientMemory";
import { getSessionSummary } from "@/lib/agents/tools/getSessionSummary";
import { listDocuments } from "@/lib/agents/tools/listDocuments";
import { listPatients } from "@/lib/agents/tools/listPatients";
import { readDocument } from "@/lib/agents/tools/readDocument";
import { searchSessions } from "@/lib/agents/tools/searchSessions";

const BASE_INSTRUCTIONS = `You are a clinical workspace assistant for a single-clinician prototype.

Help the doctor find patients, review session SOAP summaries, patient memory, and uploaded documents.

Rules:
- Prefer tools over guessing. Use listPatients / searchSessions before loading PHI-heavy summaries.
- Use askClarifyingQuestion when the request is ambiguous (which patient, which visit, etc.).
- Never invent clinical facts. If a tool returns nothing, say so.
- When a tool execution is not approved, do not retry the same tool call; acknowledge the denial and offer alternatives.
- Keep answers concise and clinically useful. Use markdown sparingly (short headings, bullets).`;

export const clinicalAssistant = new ToolLoopAgent({
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
    // Sensitive PHI reads always need explicit clinician approval.
    readDocument: "user-approval",
    getSessionSummary: "user-approval",
    getPatientMemory: "user-approval",
  },
});

export type ClinicalAssistantUIMessage = InferAgentUIMessage<
  typeof clinicalAssistant
>;
