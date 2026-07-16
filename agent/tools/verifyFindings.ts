import { z } from "zod";
import { lineSupportsFindingWithAliases } from "@/lib/clinical-aliases";
import { getFindings, getSourceLines, upsertFindings } from "@/lib/db";
import { resolveSourceLineIds } from "@/lib/line-id";
import {
  isClinicianQuestion,
  isContentNegated,
  isNegated,
  isUncertainLanguage,
} from "@/lib/negex";
import type { Finding, SourceLine } from "@/lib/schema";

function isPatientSpeaker(speaker: string): boolean {
  return speaker.toLowerCase().includes("patient");
}

/** Case/whitespace-normalized exact substring check for evidence spans. */
function normalizeForContainment(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function spanInLine(span: string, lineText: string): boolean {
  const nSpan = normalizeForContainment(span);
  const nLine = normalizeForContainment(lineText);
  if (!nSpan) return false;
  if (nLine.includes(nSpan)) return true;

  const denseSpan = nSpan.replace(/\s+/g, "");
  const denseLine = nLine.replace(/\s+/g, "");
  return denseSpan.length >= 2 && denseLine.includes(denseSpan);
}

/**
 * Ground a finding against a line:
 * 1. Verbatim evidence_span containment (primary)
 * 2. Alias-equivalent of span or value (secondary)
 * 3. Alias-aware value match when no usable spans (legacy fallback)
 */
function lineSupportsFinding(lineText: string, finding: Finding): boolean {
  const spans = (finding.evidence_spans ?? [])
    .map((s) => s.trim())
    .filter(Boolean);

  if (spans.length > 0) {
    if (spans.some((span) => spanInLine(span, lineText))) return true;
    if (
      spans.some((span) => lineSupportsFindingWithAliases(lineText, span))
    ) {
      return true;
    }
    return lineSupportsFindingWithAliases(lineText, finding.value);
  }

  return lineSupportsFindingWithAliases(lineText, finding.value);
}

function primaryEvidencePhrase(finding: Finding): string {
  const span = (finding.evidence_spans ?? []).find((s) => s.trim());
  return span?.trim() || finding.value;
}

function lineNegatesFinding(lineText: string, finding: Finding): boolean {
  return isContentNegated(lineText, primaryEvidencePhrase(finding));
}

/** Next patient turns after a clinician question (up to maxTurns). */
function findFollowingPatientLines(
  lines: SourceLine[],
  afterIndex: number,
  maxTurns = 3,
): SourceLine[] {
  const result: SourceLine[] = [];
  for (let i = afterIndex + 1; i < lines.length && result.length < maxTurns; i++) {
    if (isPatientSpeaker(lines[i].speaker)) {
      result.push(lines[i]);
    }
  }
  return result;
}

function lineIndex(lines: SourceLine[], lineId: string): number {
  return lines.findIndex((line) => line.line_id === lineId);
}

export async function verifyFindingsExecute(input: {
  sessionId: string;
}): Promise<{
  verified: number;
  unverified: number;
  contradicted: number;
}> {
  "use step";

  const [findings, lines] = await Promise.all([
    getFindings(input.sessionId),
    getSourceLines(input.sessionId),
  ]);

  let verified = 0;
  let unverified = 0;
  let contradicted = 0;

  const updated = findings.map((finding) => {
    const citedIds = resolveSourceLineIds(finding.source_lines, lines);
    const citedLines = citedIds
      .map((lineId) => lines.find((line) => line.line_id === lineId))
      .filter((line): line is SourceLine => Boolean(line));

    if (citedLines.length === 0) {
      unverified += 1;
      return {
        ...finding,
        source_lines: citedIds.length > 0 ? citedIds : finding.source_lines,
        verification_status: "unverified" as const,
        confidence: Math.min(finding.confidence, 0.4),
      };
    }

    const polarity = finding.polarity;
    const resolvedFinding: Finding = {
      ...finding,
      source_lines: citedIds,
    };

    if (polarity === "uncertain") {
      const contentSupported = citedLines.some((line) =>
        lineSupportsFinding(line.text, resolvedFinding),
      );
      const hasUncertaintyCue = citedLines.some(
        (line) =>
          isUncertainLanguage(line.text) ||
          /\b(maybe|possibly|unsure|not sure|i think)\b/i.test(line.text),
      );

      if (contentSupported || hasUncertaintyCue) {
        verified += 1;
        return {
          ...resolvedFinding,
          verification_status: "verified" as const,
        };
      }

      unverified += 1;
      return {
        ...resolvedFinding,
        verification_status: "unverified" as const,
        confidence: Math.min(finding.confidence, 0.5),
      };
    }

    if (polarity === "denied" || polarity === "absent") {
      const hasPatientNegation = citedLines.some(
        (line) =>
          isPatientSpeaker(line.speaker) &&
          (isNegated(line.text) || lineNegatesFinding(line.text, resolvedFinding)),
      );
      const hasClinicianQuestion = citedLines.some(
        (line) =>
          !isPatientSpeaker(line.speaker) && isClinicianQuestion(line.text),
      );
      const hasExplicitPatientDenial = citedLines.some(
        (line) =>
          isPatientSpeaker(line.speaker) &&
          lineSupportsFinding(line.text, resolvedFinding),
      );
      const hasClinicianDenialStatement = citedLines.some(
        (line) =>
          !isPatientSpeaker(line.speaker) &&
          !isClinicianQuestion(line.text) &&
          (isNegated(line.text) ||
            lineNegatesFinding(line.text, resolvedFinding) ||
            lineSupportsFinding(line.text, resolvedFinding)),
      );

      // Denied = clinician question + patient NegEx (or content-bearing denial)
      if (hasClinicianQuestion && (hasPatientNegation || hasExplicitPatientDenial)) {
        verified += 1;
        return {
          ...resolvedFinding,
          verification_status: "verified" as const,
        };
      }

      // Clinician documents absence without a Q&A pair (notes / exam)
      if (hasClinicianDenialStatement && !hasClinicianQuestion) {
        verified += 1;
        return {
          ...resolvedFinding,
          verification_status: "verified" as const,
        };
      }

      if (hasExplicitPatientDenial || hasPatientNegation) {
        unverified += 1;
        return {
          ...resolvedFinding,
          verification_status: "unverified" as const,
          confidence: Math.min(finding.confidence, 0.5),
        };
      }

      unverified += 1;
      return {
        ...resolvedFinding,
        verification_status: "unverified" as const,
        confidence: Math.min(finding.confidence, 0.4),
      };
    }

    // polarity === "present" (default path)
    const patientAffirmation = citedLines.some(
      (line) =>
        isPatientSpeaker(line.speaker) &&
        lineSupportsFinding(line.text, resolvedFinding) &&
        !lineNegatesFinding(line.text, resolvedFinding),
    );

    const clinicianObjective = citedLines.some(
      (line) =>
        !isPatientSpeaker(line.speaker) &&
        lineSupportsFinding(line.text, resolvedFinding) &&
        !isClinicianQuestion(line.text),
    );

    if (patientAffirmation || clinicianObjective) {
      verified += 1;
      return {
        ...resolvedFinding,
        verification_status: "verified" as const,
      };
    }

    const questionOnlyMatches = citedLines.filter(
      (line) =>
        !isPatientSpeaker(line.speaker) &&
        isClinicianQuestion(line.text) &&
        lineSupportsFinding(line.text, resolvedFinding),
    );

    if (questionOnlyMatches.length > 0) {
      for (const questionLine of questionOnlyMatches) {
        const idx = lineIndex(lines, questionLine.line_id);
        const patientAnswers = findFollowingPatientLines(lines, idx, 3);
        if (
          patientAnswers.some(
            (answer) =>
              isNegated(answer.text) ||
              lineNegatesFinding(answer.text, resolvedFinding),
          )
        ) {
          contradicted += 1;
          return {
            ...resolvedFinding,
            verification_status: "contradicted" as const,
            confidence: Math.min(finding.confidence, 0.3),
          };
        }
        // Affirmative patient reply after the question supports the finding
        if (
          patientAnswers.some(
            (answer) =>
              lineSupportsFinding(answer.text, resolvedFinding) &&
              !lineNegatesFinding(answer.text, resolvedFinding),
          )
        ) {
          verified += 1;
          return {
            ...resolvedFinding,
            verification_status: "verified" as const,
          };
        }
      }

      unverified += 1;
      return {
        ...resolvedFinding,
        verification_status: "unverified" as const,
        confidence: Math.min(finding.confidence, 0.4),
      };
    }

    const looselySupported = citedLines.some((line) =>
      lineSupportsFinding(line.text, resolvedFinding),
    );

    if (!looselySupported) {
      unverified += 1;
      return {
        ...resolvedFinding,
        verification_status: "unverified" as const,
        confidence: Math.min(finding.confidence, 0.5),
      };
    }

    unverified += 1;
    return {
      ...resolvedFinding,
      verification_status: "unverified" as const,
      confidence: Math.min(finding.confidence, 0.5),
    };
  });

  await upsertFindings(updated);

  return { verified, unverified, contradicted };
}

export const verifyFindingsTool = {
  description:
    "Verify that each finding's cited source lines and evidence spans support the extracted claim, including NegEx Q&A negation pairs and clinical alias matching.",
  inputSchema: z.object({
    sessionId: z.string(),
  }),
  execute: verifyFindingsExecute,
};
