import type { Patient, SessionDetailResponse } from "@/lib/schema";
import { getFindingCategory } from "@/lib/finding-category";
import { resolveSourceLineIds } from "@/lib/line-id";
import type {
  ConfidenceLevel,
  Finding,
  Insight,
  InsightType,
  SessionStatus,
  SessionView,
  SoapSection,
  SoapSectionKey,
  SourceLine,
} from "@/lib/types/session";

const SOAP_SECTIONS: { key: SoapSectionKey; title: string }[] = [
  { key: "subjective", title: "Subjective" },
  { key: "objective", title: "Objective" },
  { key: "assessment", title: "Assessment" },
  { key: "plan", title: "Plan" },
];

function mapStatus(status: SessionDetailResponse["session"]["status"]): SessionStatus {
  switch (status) {
    case "completed":
      return "complete";
    case "failed":
      return "error";
    default:
      return status;
  }
}

function mapConfidence(score: number, verified: boolean): ConfidenceLevel {
  if (!verified) return "low";
  if (score >= 0.8) return "high";
  if (score >= 0.6) return "medium";
  return "low";
}

function mapSpeaker(speaker: string): SourceLine["speaker"] {
  const normalized = speaker.toLowerCase();
  if (normalized.includes("patient")) return "patient";
  return "doctor";
}

function mapInsightType(
  type: SessionDetailResponse["insights"][number]["type"],
): InsightType {
  switch (type) {
    case "longitudinal_pattern":
      return "longitudinal_pattern";
    case "safety_triage":
    case "completeness":
      return "diagnostic_consideration";
    case "omission_risk":
    default:
      return "omission_risk";
  }
}

function insightTitle(type: InsightType): string {
  switch (type) {
    case "longitudinal_pattern":
      return "Longitudinal Pattern";
    case "diagnostic_consideration":
      return "Diagnostic Consideration";
    case "omission_risk":
    default:
      return "Omission Risk";
  }
}

function patientName(patient: Patient | null | undefined, patientId: string): string {
  if (patient?.name) return patient.name;
  return patientId
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function narrativeToFindings(
  section: SoapSectionKey,
  narrative: string,
  prefix: string,
): Finding[] {
  const sentences = narrative
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length === 0) return [];

  return sentences.map((text, index) => ({
    id: `${prefix}-narrative-${index}`,
    section,
    text,
    category: "general" as const,
    source_line_ids: [],
    verified: true,
    confidence: "medium" as const,
  }));
}

/**
 * Finding `type` values look like "blood pressure", "medication.metformin",
 * or "symptom.fatigue" depending on how the extraction model phrased them.
 * Turn these into a short, title-cased label so a bare value like
 * "128/82 mmHg" reads as "Blood Pressure: 128/82 mmHg" instead of floating
 * without context.
 */
function humanizeFindingType(type: string): string {
  const words = type
    .split(/[._-]+/)
    .flatMap((segment) => segment.split(/\s+/))
    .filter(Boolean);

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatFindingDisplayValue(
  value: string,
  polarity: SessionDetailResponse["findings"][number]["polarity"],
): string {
  if (polarity !== "denied" && polarity !== "absent") return value;

  const normalized = value.trim().toLowerCase();
  if (
    normalized.startsWith("denies ") ||
    normalized.startsWith("no ") ||
    normalized.startsWith("never ") ||
    normalized.startsWith("non-") ||
    normalized.startsWith("non ") ||
    normalized.includes("not present") ||
    normalized.includes("without ") ||
    normalized.includes("negative for")
  ) {
    return value;
  }

  return `Denies ${value}`;
}

function dbFindingToUi(
  finding: SessionDetailResponse["findings"][number],
  section: SoapSectionKey,
  sourceLines: SourceLine[],
): Finding {
  const verified = finding.verification_status === "verified";
  const label = humanizeFindingType(finding.type);
  const category = getFindingCategory(finding.type);
  const displayValue = formatFindingDisplayValue(
    finding.value,
    finding.polarity,
  );
  return {
    id: finding.finding_id,
    section,
    text: label ? `${label}: ${displayValue}` : displayValue,
    category,
    finding_type: finding.type,
    label: label || undefined,
    value: displayValue,
    polarity: finding.polarity,
    highlight_text: displayValue,
    source_line_ids: resolveSourceLineIds(finding.source_lines, sourceLines),
    verified,
    confidence: mapConfidence(finding.confidence, verified),
  };
}

export type SessionDetailWithPatient = SessionDetailResponse & {
  patient?: Patient | null;
};

export function sessionDetailToUi(detail: SessionDetailWithPatient): SessionView {
  const { session, source_lines, findings, insights } = detail;
  const findingById = new Map(findings.map((f) => [f.finding_id, f]));

  const uiSourceLines: SourceLine[] = source_lines.map((line) => ({
    line_id: line.line_id,
    speaker: mapSpeaker(line.speaker),
    text: line.text,
  }));

  const soap: SoapSection[] = SOAP_SECTIONS.map(({ key, title }) => {
    const section = session.soap?.[key];
    const sectionFindings: Finding[] = [];

    if (section?.finding_ids?.length) {
      for (const findingId of section.finding_ids) {
        const finding = findingById.get(findingId);
        if (!finding) continue;
        sectionFindings.push(dbFindingToUi(finding, key, uiSourceLines));
      }
    }

    if (sectionFindings.length === 0 && section?.narrative) {
      sectionFindings.push(
        ...narrativeToFindings(key, section.narrative, key),
      );
    }

    return { key, title, findings: sectionFindings };
  });

  const referencedFindingIds = new Set(
    soap.flatMap((section) => section.findings.map((finding) => finding.id)),
  );
  const orphanFindings = findings.filter(
    (finding) => !referencedFindingIds.has(finding.finding_id),
  );

  if (orphanFindings.length > 0) {
    const subjective = soap.find((section) => section.key === "subjective");
    if (subjective) {
      subjective.findings.push(
        ...orphanFindings.map((finding) =>
          dbFindingToUi(finding, "subjective", uiSourceLines),
        ),
      );
    }
  }

  const uiInsights: Insight[] = insights.map((insight) => {
    const type = mapInsightType(insight.type);
    const sourceLineIds = resolveSourceLineIds(
      insight.source_lines,
      uiSourceLines,
    );
    return {
      id: insight.insight_id,
      type,
      title: insightTitle(type),
      description: insight.summary,
      source_count: sourceLineIds.length,
      source_line_ids: sourceLineIds,
      memory_context_used: insight.memory_context_used,
      memory_reason: insight.memory_reason ?? null,
      memory_fields_used: insight.memory_fields_used ?? [],
    };
  });

  const verifiedFindings = findings.filter(
    (f) => f.verification_status === "verified",
  );
  const avgConfidence =
    verifiedFindings.length > 0
      ? verifiedFindings.reduce((sum, f) => sum + f.confidence, 0) /
        verifiedFindings.length
      : 0.5;

  const transcript = uiSourceLines
    .map((line) => {
      const label = line.speaker === "doctor" ? "Doctor" : "Patient";
      return `${label}: ${line.text}`;
    })
    .join("\n");

  return {
    id: session.session_id,
    patient_id: session.patient_id,
    patient_name: patientName(detail.patient, session.patient_id),
    status: mapStatus(session.status),
    visit_date: session.created_at.slice(0, 10),
    visit_type: session.visit_type,
    transcript,
    source_lines: uiSourceLines,
    soap,
    insights: uiInsights,
    agent_metadata: {
      confidence: mapConfidence(avgConfidence, verifiedFindings.length > 0),
      last_generated: session.updated_at,
      clinician_edits: session.agent_metadata?.edit_log?.length ?? 0,
      verified:
        session.status === "completed" &&
        findings.length > 0 &&
        findings.every((f) => f.verification_status === "verified"),
    },
    pipeline_progress: session.agent_metadata?.pipeline_progress
      ? {
          current_step: session.agent_metadata.pipeline_progress.current_step,
          completed_steps:
            session.agent_metadata.pipeline_progress.completed_steps ?? [],
          failed_step: session.agent_metadata.pipeline_progress.failed_step,
          error_message: session.agent_metadata.pipeline_progress.error_message,
        }
      : undefined,
    patient_memory: session.agent_metadata?.patient_memory ?? null,
  };
}
