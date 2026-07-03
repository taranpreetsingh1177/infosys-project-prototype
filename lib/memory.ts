import type { Finding, PatientMemorySnapshot, Session } from "@/lib/schema";
import { PatientMemoryStructuredSchema } from "@/lib/schema";

export function emptyPatientMemoryStructured() {
  return PatientMemoryStructuredSchema.parse({});
}

export function toPatientMemorySnapshot(
  memory: {
    memory_id: string;
    version: number;
    summary: string;
    structured: unknown;
  },
): PatientMemorySnapshot {
  return {
    memory_id: memory.memory_id,
    version: memory.version,
    summary: memory.summary,
    structured: PatientMemoryStructuredSchema.parse(memory.structured ?? {}),
  };
}

export function buildSessionFindingsSummary(findings: Finding[]): string {
  return findings
    .map(
      (finding) =>
        `${finding.type}: ${finding.value} (${finding.polarity}, ${finding.temporality})`,
    )
    .join("\n");
}

export function buildSoapSummary(soap: NonNullable<Session["soap"]>): string {
  const sections = ["subjective", "objective", "assessment", "plan"] as const;
  return sections
    .map((key) => {
      const section = soap[key];
      if (!section?.narrative?.trim()) return null;
      return `${key.toUpperCase()}: ${section.narrative}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

export function buildPriorMemorySummary(
  priorMemory: PatientMemorySnapshot | null | undefined,
): string {
  if (!priorMemory) {
    return "No prior patient memory on file.";
  }

  return JSON.stringify(
    {
      version: priorMemory.version,
      summary: priorMemory.summary,
      structured: priorMemory.structured,
    },
    null,
    2,
  );
}
