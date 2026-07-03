export const PIPELINE_STEP_IDS = [
  "extractFindings",
  "verifyFindings",
  "structureSoap",
  "flagCompleteness",
  "loadPatientMemory",
  "generateInsights",
  "updatePatientMemory",
  "writeBack",
] as const;

export type PipelineStepId = (typeof PIPELINE_STEP_IDS)[number];

export interface PipelineStepDefinition {
  id: PipelineStepId;
  label: string;
  description: string;
}

export const PIPELINE_STEPS: PipelineStepDefinition[] = [
  {
    id: "extractFindings",
    label: "Extracting findings",
    description: "Identifying clinical facts from the transcript",
  },
  {
    id: "verifyFindings",
    label: "Verifying findings",
    description: "Cross-checking extracted facts against source lines",
  },
  {
    id: "structureSoap",
    label: "Structuring SOAP note",
    description: "Organizing findings into Subjective, Objective, Assessment, and Plan",
  },
  {
    id: "flagCompleteness",
    label: "Checking completeness",
    description: "Flagging missing fields and contradictions",
  },
  {
    id: "loadPatientMemory",
    label: "Loading patient memory",
    description: "Retrieving longitudinal context from prior visits",
  },
  {
    id: "generateInsights",
    label: "Generating insights",
    description: "Surfacing clinical insights and recommendations",
  },
  {
    id: "updatePatientMemory",
    label: "Updating patient memory",
    description: "Merging this visit into the patient's longitudinal memory",
  },
  {
    id: "writeBack",
    label: "Finalizing session",
    description: "Marking the session complete",
  },
];
