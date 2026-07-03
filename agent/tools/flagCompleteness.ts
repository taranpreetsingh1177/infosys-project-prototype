import { z } from "zod";
import { getExpectedFindings } from "@/lib/completeness";
import { buildCompletenessFlags } from "@/lib/decisions";
import { getSession, getFindings, updateSession } from "@/lib/db";

export async function flagCompletenessExecute(input: {
  sessionId: string;
  visitType?: string;
}): Promise<{
  missing_fields: string[];
  contradictions: number;
  low_confidence: number;
}> {
  "use step";

  const session = await getSession(input.sessionId);
  if (!session) {
    throw new Error(`Session not found: ${input.sessionId}`);
  }

  const visitType = input.visitType ?? session.visit_type;
  const findings = await getFindings(input.sessionId);
  const presentTypes = findings.map((finding) => finding.type);
  const expectedTypes = getExpectedFindings(visitType);
  const flags = buildCompletenessFlags(presentTypes, expectedTypes, findings);

  await updateSession(input.sessionId, { flags });

  return {
    missing_fields: flags.missing_fields,
    contradictions: flags.contradictions.length,
    low_confidence: flags.low_confidence.length,
  };
}

export const flagCompletenessTool = {
  description:
    "Flag missing expected findings, contradictions, and low-confidence extractions.",
  inputSchema: z.object({
    sessionId: z.string(),
    visitType: z.string().optional(),
  }),
  execute: flagCompletenessExecute,
};
