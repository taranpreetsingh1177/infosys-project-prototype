import { openai } from "@ai-sdk/openai";

export const clinicalScribeModel = openai("gpt-5.3-chat-latest");
