export const EXPECTED_FINDINGS: Record<string, string[]> = {
  general_adult_outpatient: [
    "chief_complaint",
    "vital.bp",
    "vital.heart_rate",
    "vital.temperature",
    "allergy.status",
    "medication.current",
    "symptom.review",
    "plan.follow_up",
  ],
  urgent_care: [
    "chief_complaint",
    "vital.bp",
    "vital.heart_rate",
    "vital.oxygen_saturation",
    "allergy.status",
    "symptom.onset",
    "plan.treatment_steps",
  ],
};

export const RED_FLAG_SYMPTOMS: string[] = [
  "chest pain",
  "severe headache",
  "breathing difficulty",
  "shortness of breath",
  "loss of consciousness",
  "suicidal ideation",
  "stroke symptoms",
  "severe abdominal pain",
  "uncontrolled bleeding",
];

export const DEFAULT_VISIT_TYPE = "general_adult_outpatient";

export function getExpectedFindings(visitType: string): string[] {
  return EXPECTED_FINDINGS[visitType] ?? EXPECTED_FINDINGS[DEFAULT_VISIT_TYPE];
}
