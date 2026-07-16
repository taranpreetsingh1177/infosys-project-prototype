import { generateObject } from "ai";
import { clinicalScribeModel } from "@/lib/ai";
import { z } from "zod";
import { buildExtractFindingsPrompt } from "@/agent/prompts";
import {
  getSourceLines,
  upsertFindings,
} from "@/lib/db";
import { resolveSourceLineIds } from "@/lib/line-id";
import {
  FindingSchema,
  FindingsExtractionSchema,
  type Finding,
} from "@/lib/schema";

export async function extractFindingsExecute(input: {
  sessionId: string;
}): Promise<{ count: number; finding_ids: string[] }> {
  "use step";

  const lines = await getSourceLines(input.sessionId);
  if (lines.length === 0) {
    throw new Error(
      `No source lines found for session ${input.sessionId}. Transcription must complete before extraction.`,
    );
  }

  const { object } = await generateObject({
    model: clinicalScribeModel,
    schema: FindingsExtractionSchema,
    prompt: buildExtractFindingsPrompt(lines),
  });

  if (object.findings.length === 0) {
    throw new Error(
      `Extraction returned no findings for session ${input.sessionId}.`,
    );
  }

  const findings: Finding[] = object.findings.map((finding) =>
    FindingSchema.parse({
      ...finding,
      evidence_spans: (finding.evidence_spans ?? [])
        .map((span) => span.trim())
        .filter(Boolean),
      source_lines: resolveSourceLineIds(finding.source_lines, lines),
      finding_id: crypto.randomUUID(),
      session_id: input.sessionId,
      verification_status: "unverified",
    }),
  );

  await upsertFindings(findings);

  return {
    count: findings.length,
    finding_ids: findings.map((f) => f.finding_id),
  };
}

export const extractFindingsTool = {
  description:
    "Extract grouped, readable clinical findings from source lines with line_id citations, evidence spans, and explicit negation handling.",
  inputSchema: z.object({
    sessionId: z.string(),
  }),
  execute: extractFindingsExecute,
};
