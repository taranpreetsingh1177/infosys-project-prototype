import { createAgentUIStreamResponse } from "ai";

import { clinicalAssistant } from "@/lib/agents/clinical-assistant";

export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json();
  const { messages } = body as {
    messages: unknown[];
  };

  return createAgentUIStreamResponse({
    agent: clinicalAssistant,
    uiMessages: messages,
    sendReasoning: true,
  });
}
