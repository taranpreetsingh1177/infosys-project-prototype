import { openai } from "@ai-sdk/openai";

/** Structured extraction / SOAP scribe — ChatGPT snapshot model. */
export const clinicalScribeModel = openai("gpt-5.3-chat-latest");

/**
 * Clinician chat agent. Prefer an API reasoning model that streams
 * `reasoning.summary` deltas. `gpt-5.3-chat-latest` often emits empty
 * reasoning parts (start/end, no text), so the UI has nothing to show.
 */
export const clinicalAssistantModel = openai("gpt-5");
