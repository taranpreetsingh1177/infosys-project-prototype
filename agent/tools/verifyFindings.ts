import { z } from "zod";
import { getFindings, getSourceLines, upsertFindings } from "@/lib/db";
import type { Finding, SourceLine } from "@/lib/schema";

function isPatientSpeaker(speaker: string): boolean {
  return speaker.toLowerCase().includes("patient");
}

function isNegationText(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  if (
    normalized === "no" ||
    normalized === "no." ||
    normalized.startsWith("no ") ||
    normalized.startsWith("nope")
  ) {
    return true;
  }
  if (
    normalized.includes("denies") ||
    normalized.includes("denied") ||
    normalized.includes("never")
  ) {
    return true;
  }
  if (
    normalized.includes("not ") &&
    (normalized.includes("have") || normalized.includes("any"))
  ) {
    return true;
  }
  return false;
}

function isClinicianQuestion(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return (
    normalized.includes("?") ||
    /^(have you|do you|did you|any |are you|is there|have there)/.test(
      normalized,
    )
  );
}

function lineSupportsFinding(lineText: string, finding: Finding): boolean {
  const normalizedLine = lineText.toLowerCase();
  const normalizedValue = finding.value.toLowerCase();
  const tokens = normalizedValue
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]/g, ""))
    .filter((token) => token.length > 2);

  if (tokens.length === 0) {
    return normalizedLine.includes(normalizedValue);
  }

  const denseLine = normalizedLine.replace(/[^a-z0-9]+/g, "");
  const matchedTokens = tokens.filter(
    (token) => normalizedLine.includes(token) || denseLine.includes(token),
  );
  return matchedTokens.length >= Math.ceil(tokens.length * 0.5);
}

function findFollowingPatientLine(
  lines: SourceLine[],
  afterIndex: number,
): SourceLine | null {
  for (let i = afterIndex + 1; i < lines.length; i++) {
    if (isPatientSpeaker(lines[i].speaker)) return lines[i];
  }
  return null;
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

  const lineMap = new Map(lines.map((line) => [line.line_id, line.text]));
  let verified = 0;
  let unverified = 0;
  let contradicted = 0;

  const updated = findings.map((finding) => {
    const citedIds = finding.source_lines.filter((id) => lineMap.has(id));
    const citedLines = citedIds
      .map((lineId) => lines.find((line) => line.line_id === lineId))
      .filter((line): line is SourceLine => Boolean(line));

    if (citedLines.length === 0) {
      unverified += 1;
      return {
        ...finding,
        verification_status: "unverified" as const,
        confidence: Math.min(finding.confidence, 0.4),
      };
    }

    const polarity = finding.polarity;

    if (polarity === "denied" || polarity === "absent") {
      const hasPatientNegation = citedLines.some(
        (line) =>
          isPatientSpeaker(line.speaker) && isNegationText(line.text),
      );
      const hasClinicianQuestion = citedLines.some(
        (line) =>
          !isPatientSpeaker(line.speaker) &&
          isClinicianQuestion(line.text),
      );
      const hasExplicitPatientDenial = citedLines.some(
        (line) =>
          isPatientSpeaker(line.speaker) &&
          lineSupportsFinding(line.text, finding),
      );

      if (hasPatientNegation && hasClinicianQuestion) {
        verified += 1;
        return { ...finding, verification_status: "verified" as const };
      }

      if (hasExplicitPatientDenial && hasClinicianQuestion) {
        verified += 1;
        return { ...finding, verification_status: "verified" as const };
      }

      if (hasExplicitPatientDenial || hasPatientNegation) {
        unverified += 1;
        return {
          ...finding,
          verification_status: "unverified" as const,
          confidence: Math.min(finding.confidence, 0.5),
        };
      }

      unverified += 1;
      return {
        ...finding,
        verification_status: "unverified" as const,
        confidence: Math.min(finding.confidence, 0.4),
      };
    }

    const patientAffirmation = citedLines.some(
      (line) =>
        isPatientSpeaker(line.speaker) &&
        lineSupportsFinding(line.text, finding) &&
        !isNegationText(line.text),
    );

    const clinicianObjective = citedLines.some(
      (line) =>
        !isPatientSpeaker(line.speaker) &&
        lineSupportsFinding(line.text, finding) &&
        !isClinicianQuestion(line.text),
    );

    if (patientAffirmation || clinicianObjective) {
      verified += 1;
      return { ...finding, verification_status: "verified" as const };
    }

    const questionOnlyMatches = citedLines.filter(
      (line) =>
        !isPatientSpeaker(line.speaker) &&
        isClinicianQuestion(line.text) &&
        lineSupportsFinding(line.text, finding),
    );

    if (questionOnlyMatches.length > 0) {
      for (const questionLine of questionOnlyMatches) {
        const idx = lineIndex(lines, questionLine.line_id);
        const patientAnswer = findFollowingPatientLine(lines, idx);
        if (patientAnswer && isNegationText(patientAnswer.text)) {
          contradicted += 1;
          return {
            ...finding,
            verification_status: "contradicted" as const,
            confidence: Math.min(finding.confidence, 0.3),
          };
        }
      }

      unverified += 1;
      return {
        ...finding,
        verification_status: "unverified" as const,
        confidence: Math.min(finding.confidence, 0.4),
      };
    }

    const looselySupported = citedLines.some((line) =>
      lineSupportsFinding(line.text, finding),
    );

    if (!looselySupported) {
      unverified += 1;
      return {
        ...finding,
        verification_status: "unverified" as const,
        confidence: Math.min(finding.confidence, 0.5),
      };
    }

    unverified += 1;
    return {
      ...finding,
      verification_status: "unverified" as const,
      confidence: Math.min(finding.confidence, 0.5),
    };
  });

  await upsertFindings(updated);

  return { verified, unverified, contradicted };
}

export const verifyFindingsTool = {
  description:
    "Verify that each finding's cited source lines support the extracted claim, including Q&A negation pairs.",
  inputSchema: z.object({
    sessionId: z.string(),
  }),
  execute: verifyFindingsExecute,
};
