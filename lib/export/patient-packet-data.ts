import { sessionDetailToUi } from "@/lib/adapters/session-to-ui";
import type { SessionDetailWithPatient } from "@/lib/adapters/session-to-ui";

export interface PatientPacketFinding {
  text: string;
}

export interface PatientPacketSoapSection {
  title: string;
  narrative: string;
  findings: PatientPacketFinding[];
}

export interface PatientPacketInsight {
  title: string;
  summary: string;
}

export interface PatientPacket {
  patientName: string;
  mrn: string | null;
  dateOfBirth: string | null;
  visitDate: string;
  visitType: string;
  soap: PatientPacketSoapSection[];
  keyFindings: PatientPacketFinding[];
  insights: PatientPacketInsight[];
}

function formatVisitType(visitType: string): string {
  return visitType
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDisplayDate(isoDate: string): string {
  const date = new Date(isoDate.includes("T") ? isoDate : `${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Build a patient-facing packet from session detail.
 * Includes SOAP narratives, verified findings, and insight summaries —
 * excludes confidence scores, pipeline flags, agent metadata, and raw transcript.
 */
export function buildPatientPacket(
  detail: SessionDetailWithPatient,
): PatientPacket {
  const view = sessionDetailToUi(detail);
  const { session, patient, findings } = detail;

  const soap: PatientPacketSoapSection[] = view.soap.map((section) => {
    const narrative =
      session.soap?.[section.key]?.narrative?.trim() ??
      section.findings.map((f) => f.text).join(" ");

    const sectionFindings = section.findings
      .filter((f) => f.verified && !f.id.includes("-narrative-"))
      .map((f) => ({ text: f.text }));

    return {
      title: section.title,
      narrative,
      findings: sectionFindings,
    };
  });

  const verifiedDbIds = new Set(
    findings
      .filter((f) => f.verification_status === "verified")
      .map((f) => f.finding_id),
  );

  const keyFindings: PatientPacketFinding[] = view.soap
    .flatMap((section) => section.findings)
    .filter(
      (f) =>
        verifiedDbIds.has(f.id) ||
        (f.verified && !f.id.includes("-narrative-")),
    )
    .map((f) => ({ text: f.text }));

  // Deduplicate by text while preserving order
  const seen = new Set<string>();
  const uniqueFindings = keyFindings.filter((f) => {
    if (seen.has(f.text)) return false;
    seen.add(f.text);
    return true;
  });

  return {
    patientName: view.patient_name,
    mrn: patient?.mrn ?? null,
    dateOfBirth: patient?.date_of_birth
      ? formatDisplayDate(patient.date_of_birth)
      : null,
    visitDate: formatDisplayDate(view.visit_date),
    visitType: formatVisitType(view.visit_type ?? session.visit_type),
    soap,
    keyFindings: uniqueFindings,
    insights: view.insights.map((insight) => ({
      title: insight.title,
      summary: insight.description,
    })),
  };
}
