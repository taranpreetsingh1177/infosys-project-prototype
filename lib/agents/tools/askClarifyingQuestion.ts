import { tool } from "ai";
import { z } from "zod";

export const askClarifyingQuestion = tool({
  description:
    "Ask the clinician a clarifying question with optional suggested reply choices before running a broad patient or document search.",
  inputSchema: z.object({
    question: z.string().describe("Question to show the clinician"),
    options: z
      .array(z.string())
      .min(1)
      .max(6)
      .optional()
      .describe("Suggested short replies the clinician can pick"),
  }),
  execute: async ({ question, options }) => {
    return {
      question,
      options: options ?? [],
      awaiting_reply: true,
    };
  },
});
