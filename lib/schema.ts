import { z } from "zod";

export const PatientStatusSchema = z.enum([
  "active",
  "inactive",
  "new",
  "archived",
]);

export const PatientGenderSchema = z.enum([
  "male",
  "female",
  "other",
  "unknown",
]);

export const PatientSchema = z.object({
  patient_id: z.string(),
  name: z.string(),
  date_of_birth: z.string().nullable().optional(),
  mrn: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  gender: PatientGenderSchema.nullable().optional(),
  status: PatientStatusSchema.default("active"),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Patient = z.infer<typeof PatientSchema>;

export const SourceLineSchema = z.object({
  line_id: z.string(),
  session_id: z.string(),
  speaker: z.string(),
  text: z.string(),
  sequence: z.number().int().nonnegative(),
});

export type SourceLine = z.infer<typeof SourceLineSchema>;

export const FindingPolaritySchema = z.enum([
  "present",
  "absent",
  "denied",
  "uncertain",
]);

export const FindingTemporalitySchema = z.enum([
  "current",
  "historical",
  "resolved",
  "unknown",
]);

export const VerificationStatusSchema = z.enum([
  "verified",
  "unverified",
  "contradicted",
]);

export const FindingSchema = z.object({
  finding_id: z.string(),
  session_id: z.string(),
  type: z.string(),
  value: z.string(),
  polarity: FindingPolaritySchema,
  temporality: FindingTemporalitySchema,
  confidence: z.number().min(0).max(1),
  source_lines: z.array(z.string()),
  asserted_by: z
    .enum(["patient", "clinician", "system", "unknown"])
    .default("unknown"),
  verification_status: VerificationStatusSchema.default("unverified"),
});

export type Finding = z.infer<typeof FindingSchema>;

export const InsightTypeSchema = z.enum([
  "omission_risk",
  "longitudinal_pattern",
  "safety_triage",
  "completeness",
  "general",
]);

export const InsightSchema = z.object({
  insight_id: z.string(),
  session_id: z.string(),
  type: InsightTypeSchema,
  summary: z.string(),
  confidence: z.number().min(0).max(1),
  source_lines: z.array(z.string()),
  graph_context_used: z.boolean().default(false),
  clinician_action: z.string().optional(),
});

export type Insight = z.infer<typeof InsightSchema>;

export const SoapSectionSchema = z.object({
  narrative: z.string(),
  finding_ids: z.array(z.string()).default([]),
});

export type SoapSection = z.infer<typeof SoapSectionSchema>;

export const SessionFlagsSchema = z.object({
  missing_fields: z.array(z.string()).default([]),
  contradictions: z
    .array(
      z.object({
        description: z.string(),
        finding_ids: z.array(z.string()),
      }),
    )
    .default([]),
  low_confidence: z.array(z.string()).default([]),
});

export type SessionFlags = z.infer<typeof SessionFlagsSchema>;

export const EditLogEntrySchema = z.object({
  field: z.string(),
  old_value: z.unknown(),
  new_value: z.unknown(),
  edited_at: z.string(),
  edited_by: z.string().optional(),
});

export const SessionStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const InputTypeSchema = z.enum(["transcript", "doctor_notes", "pdf"]);

export type InputType = z.infer<typeof InputTypeSchema>;

export const PatientMemoryRecentVisitSchema = z.object({
  session_id: z.string(),
  date: z.string(),
  one_liner: z.string(),
});

/** OpenAI structured output — all fields required (use empty arrays when none). */
export const PatientMemoryStructuredLlmSchema = z.object({
  active_problems: z.array(z.string()),
  chronic_conditions: z.array(z.string()),
  medications: z.array(z.string()),
  allergies: z.array(z.string()),
  social_history: z.array(z.string()),
  recent_visits: z.array(PatientMemoryRecentVisitSchema),
});

export const PatientMemoryStructuredSchema = z.object({
  active_problems: z.array(z.string()).default([]),
  chronic_conditions: z.array(z.string()).default([]),
  medications: z.array(z.string()).default([]),
  allergies: z.array(z.string()).default([]),
  social_history: z.array(z.string()).default([]),
  recent_visits: z.array(PatientMemoryRecentVisitSchema).default([]),
});

export type PatientMemoryStructured = z.infer<
  typeof PatientMemoryStructuredSchema
>;

export const PatientMemoryVersionSchema = z.object({
  memory_id: z.string(),
  patient_id: z.string(),
  source_session_id: z.string(),
  version: z.number().int().positive(),
  summary: z.string(),
  structured: PatientMemoryStructuredSchema,
  derived_from_session_ids: z.array(z.string()).default([]),
  superseded_at: z.string().nullable().optional(),
  created_at: z.string(),
});

export type PatientMemoryVersion = z.infer<typeof PatientMemoryVersionSchema>;

export const SymptomRecurrenceItemSchema = z.object({
  finding_type: z.string(),
  session_count: z.number(),
  session_ids: z.array(z.string()),
});

export type SymptomRecurrenceItem = z.infer<typeof SymptomRecurrenceItemSchema>;

export const PatientMemorySnapshotSchema = z.object({
  memory_id: z.string(),
  version: z.number(),
  summary: z.string(),
  structured: PatientMemoryStructuredSchema,
});

export type PatientMemorySnapshot = z.infer<typeof PatientMemorySnapshotSchema>;

export const PatientMemoryUpdateLlmSchema = z.object({
  summary: z.string(),
  structured: PatientMemoryStructuredLlmSchema,
  derived_from_session_ids: z.array(z.string()),
});

export const PatientMemoryUpdateSchema = z.object({
  summary: z.string(),
  structured: PatientMemoryStructuredSchema,
  derived_from_session_ids: z.array(z.string()),
});

export type PatientMemoryUpdate = z.infer<typeof PatientMemoryUpdateSchema>;

export const PipelineProgressSchema = z.object({
  current_step: z.string().nullable().default(null),
  completed_steps: z.array(z.string()).default([]),
  failed_step: z.string().nullable().optional(),
  error_message: z.string().nullable().optional(),
});

export const AgentMetadataSchema = z.object({
  edit_log: z.array(EditLogEntrySchema).default([]),
  pipeline_progress: PipelineProgressSchema.optional(),
  patient_memory: PatientMemorySnapshotSchema.nullable().optional(),
  symptom_recurrence: z.array(SymptomRecurrenceItemSchema).optional(),
  created_memory_id: z.string().optional(),
});

export const SessionSchema = z.object({
  session_id: z.string(),
  patient_id: z.string(),
  visit_type: z.string(),
  input_type: InputTypeSchema,
  status: SessionStatusSchema,
  workflow_run_id: z.string().nullable().optional(),
  soap: z
    .object({
      subjective: SoapSectionSchema.optional(),
      objective: SoapSectionSchema.optional(),
      assessment: SoapSectionSchema.optional(),
      plan: SoapSectionSchema.optional(),
    })
    .optional(),
  flags: SessionFlagsSchema.optional(),
  agent_metadata: AgentMetadataSchema.optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Session = z.infer<typeof SessionSchema>;

export const RuntimeContextSchema = z.object({
  sessionId: z.string(),
  pipelineStep: z.number().int().nonnegative(),
  visitType: z.string(),
});

export type RuntimeContext = z.infer<typeof RuntimeContextSchema>;

export const CreateSessionRequestSchema = z.object({
  input_type: InputTypeSchema,
  raw_text: z.string().min(1),
  patient_id: z.string(),
  visit_type: z.string().default("general_adult_outpatient"),
});

export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;

export const FindingExtractionItemSchema = z.object({
  type: z.string(),
  value: z.string(),
  polarity: FindingPolaritySchema,
  temporality: FindingTemporalitySchema,
  confidence: z.number().min(0).max(1),
  source_lines: z.array(z.string()),
  asserted_by: z.enum(["patient", "clinician", "system", "unknown"]),
});

export const FindingsExtractionSchema = z.object({
  findings: z.array(FindingExtractionItemSchema),
});

export const SoapSectionLlmSchema = z.object({
  narrative: z.string(),
  finding_ids: z.array(z.string()),
});

export const SoapStructureSchema = z.object({
  subjective: SoapSectionLlmSchema,
  objective: SoapSectionLlmSchema,
  assessment: SoapSectionLlmSchema,
  plan: SoapSectionLlmSchema,
});

export const InsightLlmSchema = z.object({
  type: InsightTypeSchema,
  summary: z.string(),
  confidence: z.number().min(0).max(1),
  source_lines: z.array(z.string()),
  clinician_action: z.string(),
});

export const InsightsGenerationSchema = z.object({
  insights: z.array(InsightLlmSchema),
});

export const SessionDetailResponseSchema = z.object({
  session: SessionSchema,
  source_lines: z.array(SourceLineSchema),
  findings: z.array(FindingSchema),
  insights: z.array(InsightSchema),
});

export type SessionDetailResponse = z.infer<typeof SessionDetailResponseSchema>;

export const RecentSessionSchema = z.object({
  session_id: z.string(),
  visit_type: z.string(),
  status: SessionStatusSchema,
  created_at: z.string(),
});

export type RecentSession = z.infer<typeof RecentSessionSchema>;

export const PatientWithSessionCountSchema = PatientSchema.extend({
  session_count: z.number(),
  last_session_at: z.string().nullable().optional(),
  recent_sessions: z.array(RecentSessionSchema).default([]),
});

export type PatientWithSessionCount = z.infer<
  typeof PatientWithSessionCountSchema
>;
