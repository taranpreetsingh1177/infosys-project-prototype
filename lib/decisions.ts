import { RED_FLAG_SYMPTOMS } from "@/lib/completeness";
import type { Finding, Insight, SessionFlags } from "@/lib/schema";

export const CONFIDENCE_THRESHOLD = 0.7;

export function isLowConfidence(confidence: number): boolean {
  return confidence < CONFIDENCE_THRESHOLD;
}

export function partitionFindingsByConfidence(findings: Finding[]): {
  asserted: Finding[];
  flagged: Finding[];
} {
  const asserted: Finding[] = [];
  const flagged: Finding[] = [];

  for (const finding of findings) {
    if (
      isLowConfidence(finding.confidence) ||
      finding.verification_status !== "verified"
    ) {
      flagged.push(finding);
    } else {
      asserted.push(finding);
    }
  }

  return { asserted, flagged };
}

export function detectContradictions(findings: Finding[]): SessionFlags["contradictions"] {
  const contradictions: SessionFlags["contradictions"] = [];
  const byType = new Map<string, Finding[]>();

  for (const finding of findings) {
    const group = byType.get(finding.type) ?? [];
    group.push(finding);
    byType.set(finding.type, group);
  }

  for (const [type, group] of byType) {
    if (group.length < 2) continue;

    const values = new Set(group.map((f) => f.value.toLowerCase().trim()));
    const polarities = new Set(group.map((f) => f.polarity));

    if (values.size > 1 || (polarities.has("present") && polarities.has("denied"))) {
      contradictions.push({
        description: `Conflicting values for ${type}`,
        finding_ids: group.map((f) => f.finding_id),
      });
    }
  }

  return contradictions;
}

function matchesRedFlag(value: string): boolean {
  const normalized = value.toLowerCase();
  return RED_FLAG_SYMPTOMS.some((symptom) => normalized.includes(symptom));
}

export function detectSafetyTriageGaps(
  findings: Finding[],
  planFindingIds: string[],
): Insight[] {
  const insights: Insight[] = [];
  const planText = findings
    .filter((f) => planFindingIds.includes(f.finding_id))
    .map((f) => f.value.toLowerCase())
    .join(" ");

  const redFlagSymptoms = findings.filter(
    (f) =>
      f.type.startsWith("symptom.") &&
      f.polarity === "present" &&
      matchesRedFlag(f.value),
  );

  for (const symptom of redFlagSymptoms) {
    const addressed =
      planText.includes(symptom.value.toLowerCase()) ||
      findings.some(
        (f) =>
          f.type.startsWith("plan.treatment_steps") &&
          f.value.toLowerCase().includes(symptom.value.toLowerCase()),
      );

    if (!addressed) {
      insights.push({
        insight_id: crypto.randomUUID(),
        session_id: symptom.session_id,
        type: "safety_triage",
        summary: `Red-flag symptom "${symptom.value}" was mentioned but not addressed in the Plan.`,
        confidence: 0.9,
        source_lines: symptom.source_lines,
        graph_context_used: false,
        clinician_action:
          "Review plan and document evaluation or management for this red-flag symptom.",
      });
    }
  }

  return insights;
}

export function detectLongitudinalPatterns(
  sessionId: string,
  currentSymptomTypes: string[],
  recurrence: Array<{
    finding_type: string;
    session_count: number;
    session_ids: string[];
  }>,
  sourceLinesByType: Map<string, string[]>,
): Insight[] {
  const insights: Insight[] = [];

  for (const pattern of recurrence) {
    if (pattern.session_count < 3) continue;
    if (!currentSymptomTypes.includes(pattern.finding_type)) continue;

    insights.push({
      insight_id: crypto.randomUUID(),
      session_id: sessionId,
      type: "longitudinal_pattern",
      summary: `${pattern.finding_type} has recurred across ${pattern.session_count} prior sessions without a resolved diagnosis.`,
      confidence: 0.85,
      source_lines: sourceLinesByType.get(pattern.finding_type) ?? [],
      graph_context_used: true,
      clinician_action:
        "Consider longitudinal workup or specialist referral for recurring symptom.",
    });
  }

  return insights;
}

export function buildCompletenessFlags(
  presentTypes: string[],
  expectedTypes: string[],
  findings: Finding[],
): SessionFlags {
  const normalizedPresent = new Set(
    presentTypes.map((type) => type.toLowerCase()),
  );
  const missing_fields = expectedTypes.filter(
    (expected) => !normalizedPresent.has(expected.toLowerCase()),
  );

  const low_confidence = findings
    .filter((f) => isLowConfidence(f.confidence))
    .map((f) => f.finding_id);

  return {
    missing_fields,
    contradictions: detectContradictions(findings),
    low_confidence,
  };
}

export function mergeInsights(
  llmInsights: Insight[],
  ruleInsights: Insight[],
): Insight[] {
  const seen = new Set<string>();
  const merged: Insight[] = [];

  for (const insight of [...ruleInsights, ...llmInsights]) {
    const key = `${insight.type}:${insight.summary}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(insight);
  }

  return merged;
}
