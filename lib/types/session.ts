import type { FindingCategory } from "@/lib/finding-category";

export type ConfidenceLevel = "high" | "medium" | "low";

export type SessionStatus = "pending" | "processing" | "complete" | "error";

export type SoapSectionKey = "subjective" | "objective" | "assessment" | "plan";

export type { FindingCategory };

export type InsightType =
  | "omission_risk"
  | "longitudinal_pattern"
  | "diagnostic_consideration";

export interface SourceLine {
  line_id: string;
  speaker: "doctor" | "patient";
  text: string;
}

export type FindingPolarity = "present" | "absent" | "denied" | "uncertain";

export interface Finding {
  id: string;
  section: SoapSectionKey;
  text: string;
  category: FindingCategory;
  finding_type?: string;
  label?: string;
  value?: string;
  polarity?: FindingPolarity;
  highlight_text?: string;
  source_line_ids: string[];
  verified: boolean;
  confidence: ConfidenceLevel;
}

export interface SoapSection {
  key: SoapSectionKey;
  title: string;
  findings: Finding[];
}

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  source_count: number;
  source_line_ids: string[];
}

export interface PipelineProgress {
  current_step: string | null;
  completed_steps: string[];
  failed_step?: string | null;
  error_message?: string | null;
}

export interface AgentMetadata {
  confidence: ConfidenceLevel;
  last_generated: string;
  clinician_edits: number;
  verified: boolean;
}

export interface SessionView {
  id: string;
  patient_id: string;
  patient_name: string;
  status: SessionStatus;
  visit_date: string;
  visit_type?: string;
  transcript: string;
  source_lines: SourceLine[];
  soap: SoapSection[];
  insights: Insight[];
  agent_metadata: AgentMetadata;
  pipeline_progress?: PipelineProgress;
}

export type PatientStatus = "active" | "inactive" | "new" | "archived";

export type PatientGender = "male" | "female" | "other" | "unknown";

export interface RecentSessionSummary {
  session_id: string;
  visit_type: string;
  status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
}

export interface PatientCard {
  patient_id: string;
  name: string;
  session_count: number;
  last_session_at: string | null;
  date_of_birth?: string | null;
  mrn?: string | null;
  phone?: string | null;
  email?: string | null;
  gender?: PatientGender | null;
  status?: PatientStatus;
  updated_at?: string;
  recent_sessions?: RecentSessionSummary[];
}
