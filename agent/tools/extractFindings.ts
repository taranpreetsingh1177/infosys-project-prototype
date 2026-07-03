import { generateObject } from "ai";
import { clinicalScribeModel } from "@/lib/ai";
import { z } from "zod";
import { buildExtractFindingsPrompt } from "@/agent/prompts";
import {
  getFindings,
  getSourceLines,
  upsertFindings,
} from "@/lib/db";
import {
  FindingSchema,
  FindingsExtractionSchema,
  type Finding,
  type SourceLine,
} from "@/lib/schema";

/**
 * LLMs frequently "simplify" long compound line_id values (e.g.
 * "<uuid>:L4") down to just their visible suffix ("L4") even when told to
 * copy them verbatim. Rather than silently dropping citations (and cascading
 * into verification/SOAP/citation-click failures), resolve each cited
 * line_id against the known set of source lines for this session, falling
 * back to a suffix/sequence match when the exact id isn't found.
 */
function resolveSourceLineIds(
  citedIds: string[],
  lines: SourceLine[],
): string[] {
  const byId = new Map(lines.map((line) => [line.line_id, line.line_id]));
  const bySuffix = new Map(
    lines.map((line) => [line.line_id.split(":").pop() ?? line.line_id, line.line_id]),
  );

  const resolved: string[] = [];
  for (const rawId of citedIds) {
    const id = rawId.trim();
    if (!id) continue;

    const exact = byId.get(id);
    if (exact) {
      resolved.push(exact);
      continue;
    }

    const suffix = id.split(":").pop() ?? id;
    const bySuffixMatch = bySuffix.get(suffix);
    if (bySuffixMatch) {
      resolved.push(bySuffixMatch);
      continue;
    }

    const numericMatch = suffix.match(/L(\d+)$/i);
    if (numericMatch) {
      const sequence = Number(numericMatch[1]) - 1;
      const bySequence = lines.find((line) => line.sequence === sequence);
      if (bySequence) {
        resolved.push(bySequence.line_id);
      }
    }
  }

  return [...new Set(resolved)];
}

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
    "Extract grouped, readable clinical findings from source lines with line_id citations and explicit negation handling.",
  inputSchema: z.object({
    sessionId: z.string(),
  }),
  execute: extractFindingsExecute,
};
