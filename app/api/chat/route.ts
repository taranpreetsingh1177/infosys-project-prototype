import { createAgentUIStreamResponse } from "ai";

import { clinicalAssistant } from "@/lib/agents/clinical-assistant";

export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json();
  const { messages, pinnedPatientId } = body as {
    messages: unknown[];
    pinnedPatientId?: string | null;
  };

  return createAgentUIStreamResponse({
    agent: clinicalAssistant,
    uiMessages: messages,
    options: {
      pinnedPatientId: pinnedPatientId?.trim() || undefined,
    },
    sendReasoning: true,
  });
}
