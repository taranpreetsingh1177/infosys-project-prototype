import { generateObject } from "ai";
import { z } from "zod";
import { clinicalScribeModel } from "@/lib/ai";
import { buildGenerateInsightsPrompt } from "@/agent/prompts";
import {
  detectLongitudinalPatterns,
  detectSafetyTriageGaps,
  mergeInsights,
} from "@/lib/decisions";
import {
  getSession,
  getFindings,
  getSourceLines,
  upsertInsights,
} from "@/lib/db";
import { resolveSourceLineIds } from "@/lib/line-id";
import type { SourceLine as UiSourceLine } from "@/lib/types/session";
import { buildPriorMemorySummary } from "@/lib/memory";
import { buildPatientDocumentsPromptSummary } from "@/lib/patient-documents";
import {
  InsightSchema,
  InsightsGenerationSchema,
  type Insight,
} from "@/lib/schema";

/**
 * Defensive cleanup for occasional LLM output glitches where stray
 * non-Latin characters get mixed into otherwise-English sentences (e.g. a
 * word getting silently transliterated). Normalizes common "smart"
 * punctuation to ASCII first (so e.g. an en-dash range like "48–72 hours"
 * survives as "48-72 hours" instead of being deleted into "4872 hours"),
 * then replaces any remaining non-Latin characters with a space (never
 * deletes them outright, to avoid gluing adjacent words/numbers together)
 * and collapses the resulting whitespace.
 */
function sanitizeClinicalText(text: string): string {
  const withAsciiPunctuation = text
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u00a0/g, " ");

  return withAsciiPunctuation
    .replace(/[^\x20-\x7E°%]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function generateInsightsExecute(input: {
  sessionId: string;
}): Promise<{ count: number; insight_ids: string[] }> {
  "use step";

  const session = await getSession(input.sessionId);
  if (!session) {
    throw new Error(`Session not found: ${input.sessionId}`);
  }

  const [findings, dbSourceLines] = await Promise.all([
    getFindings(input.sessionId),
    getSourceLines(input.sessionId),
  ]);
  const patientMemory = session.agent_metadata?.patient_memory ?? null;
  const symptomRecurrence = session.agent_metadata?.symptom_recurrence ?? [];
  const patientDocuments = session.agent_metadata?.patient_documents ?? [];

  const uiSourceLines: UiSourceLine[] = dbSourceLines.map((line) => ({
    line_id: line.line_id,
    speaker: line.speaker.toLowerCase().includes("patient")
      ? "patient"
      : "doctor",
    text: line.text,
  }));

  const findingsSummary = findings
    .map(
      (finding) =>
        `${finding.type}: ${finding.value} (${finding.polarity}, ${finding.temporality}) [${finding.source_lines.join(",")}]`,
    )
    .join("\n");

  const patientMemorySummary = buildPriorMemorySummary(patientMemory);
  const patientDocumentsSummary =
    buildPatientDocumentsPromptSummary(patientDocuments);

  const { object } = await generateObject({
    model: clinicalScribeModel,
    schema: InsightsGenerationSchema,
    prompt: buildGenerateInsightsPrompt(
      findingsSummary,
      patientMemorySummary,
      patientDocumentsSummary,
    ),
  });

  const llmInsights: Insight[] = object.insights.map((insight) => {
    const memoryReason =
      insight.memory_reason?.trim().length
        ? sanitizeClinicalText(insight.memory_reason)
        : undefined;
    const memoryUsed =
      patientMemory !== null &&
      insight.memory_context_used &&
      Boolean(memoryReason);

    return InsightSchema.parse({
      ...insight,
      summary: sanitizeClinicalText(insight.summary),
      source_lines: resolveSourceLineIds(insight.source_lines, uiSourceLines),
      insight_id: crypto.randomUUID(),
      session_id: input.sessionId,
      memory_context_used: memoryUsed,
      memory_reason: memoryUsed ? memoryReason : undefined,
      memory_fields_used: memoryUsed ? (insight.memory_fields_used ?? []) : [],
      clinician_action:
        insight.clinician_action.trim().length > 0
          ? sanitizeClinicalText(insight.clinician_action)
          : undefined,
    });
  });

  const planFindingIds =
    session.soap?.plan?.finding_ids ??
    findings
      .filter((finding) => finding.type.startsWith("plan."))
      .map((finding) => finding.finding_id);

  const sourceLinesByType = new Map<string, string[]>();
  for (const finding of findings) {
    if (!finding.type.startsWith("symptom.")) continue;
    sourceLinesByType.set(finding.type, finding.source_lines);
  }

  const ruleInsights = [
    ...detectSafetyTriageGaps(findings, planFindingIds),
    ...detectLongitudinalPatterns(
      input.sessionId,
      findings
        .filter((f) => f.type.startsWith("symptom."))
        .map((f) => f.type),
      symptomRecurrence,
      sourceLinesByType,
    ),
  ];

  const insights = mergeInsights(llmInsights, ruleInsights);
  await upsertInsights(insights);

  return {
    count: insights.length,
    insight_ids: insights.map((insight) => insight.insight_id),
  };
}

export const generateInsightsTool = {
  description:
    "Generate actionable clinical insights using findings, patient memory, and on-file documents.",
  inputSchema: z.object({
    sessionId: z.string(),
  }),
  execute: generateInsightsExecute,
};
