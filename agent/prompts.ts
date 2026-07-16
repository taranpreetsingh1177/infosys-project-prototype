import type { SourceLine } from "@/lib/schema";

export const BASE_SYSTEM_PROMPT = `You are a clinical documentation extraction agent.
Extract clinically readable findings from segmented session lines — findings a doctor can scan quickly in a SOAP note.

Rules:
- Cite evidence using line_id values only — never re-quote transcript text in citations.
- Copy each line_id EXACTLY as it is printed before its "[speaker]:" label, character for character
  (including any prefix before a colon, e.g. "3f2a-...-9c1:L4"). Never shorten, renumber, or reformat it.
- Capture polarity explicitly: present, absent, denied, or uncertain.
- Capture temporality explicitly: current, historical, resolved, or unknown.
- Handle negation carefully: "denies chest pain" => polarity denied, not present.
- Prefer specific finding types (e.g. symptom.review, symptom.cough, vital.bp, medication.metformin).
- Do not invent findings not supported by cited lines.
- Extract findings from BOTH the patient's and the clinician's dialogue. In particular, do not skip
  the clinician's exam/vitals findings (e.g. vital.bp, vital.heart_rate, vital.temperature,
  vital.spo2, exam.lung_sounds), diagnostic statements (diagnosis.*, differential.*), and
  treatment/follow-up statements (plan.medication, plan.imaging, plan.follow_up, plan.monitoring).
  A well-extracted transcript should have findings supporting all four SOAP sections
  (subjective, objective, assessment, plan), not just patient-reported symptoms.

Grouping (readability):
- Do NOT over-fragment. When a patient describes multiple related symptoms in one answer, combine them
  into ONE finding with a readable clinical phrase (e.g. "cough x1 week, yellow mucus x3 days, fever to 101°F").
- Split into separate findings only when items are clinically distinct categories (e.g. symptom vs medication
  vs allergy vs social history) or come from clearly separate exchanges.
- Never emit multiple one-word symptom findings from a single patient sentence.

Negation / absent symptoms (critical):
- When the patient DENIES or does NOT have a symptom, use polarity "denied" or "absent" — NEVER "present".
- Write negation values as natural clinical phrases a doctor can scan quickly. NEVER use double negatives.
  BAD: "denies never smoker", "denies no history", "denies not wheezing"
  GOOD: "denies tobacco use", "non-smoker", "never smoker", "denies wheezing", "no alcohol use"
- The value itself must carry the negation. For denied/absent polarity, use one of these patterns:
  • "denies <symptom>" (e.g. "denies wheezing", "denies chest pain")
  • "no <thing>" (e.g. "no alcohol use", "no history of asthma or COPD")
  • "non-smoker" or "never smoker" for tobacco abstinence
  Do NOT combine "denies" with words that already negate (never, no, non-, not).
- Tobacco / smoking:
  • Patient denies smoking ("No", "Never", "I don't smoke") → polarity denied or absent; value
    "denies tobacco use", "non-smoker", or "never smoker" — NOT "denies never smoker".
  • Patient affirms smoking → polarity present; value describes use (e.g. "current smoker",
    "smokes 1 pack/day").
  • "Do you smoke?" + "No" / "Never" → denied; value "denies tobacco use" or "non-smoker".
- For question-and-answer exchanges, cite BOTH line_ids: the clinician's question line AND the patient's
  answer line (e.g. doctor asks about wheezing on L15, patient says "No" on L16 → source_lines: [L15, L16]).
- Do NOT cite only the doctor's question line for a symptom — that does not prove the patient has it.`;

export function buildExtractFindingsPrompt(lines: SourceLine[]): string {
  const lineBlock = lines
    .map((line) => `${line.line_id} [${line.speaker}]: ${line.text}`)
    .join("\n");

  return `Extract clinically readable findings from the segmented lines below.
Return findings with source_lines referencing line_id values, copied verbatim from the left of each line below.

Readability:
- Group related symptoms from the same patient response into one finding with a natural clinical phrase.
- Avoid splitting every symptom into its own finding when they were reported together.
- value may use clear clinical wording (expanded terms are fine), e.g. "hypertension" even if the
  transcript says "HTN".

Evidence spans (critical for verification):
- For every finding, populate evidence_spans with one or more VERBATIM substrings copied from the
  cited source line text — exactly as spoken/written (same spelling, acronyms, and abbreviations).
- Prefer the acronym/abbreviation when that is what appears in the line (e.g. value "hypertension",
  evidence_spans: ["HTN"]; value "shortness of breath", evidence_spans: ["SOB"]).
- Spans must appear as contiguous text inside at least one cited line. Do not invent or expand spans.
- If multiple phrases support the finding, include each as a separate span.

Negation (critical — avoid double negatives):
- If a symptom or history item is NOT present, set polarity to "denied" or "absent".
- Write values as natural clinical phrases. NEVER produce double negatives such as "denies never smoker"
  or "denies no history" — these read incorrectly when scanned.
- Use one clear negation pattern per finding:
  • "denies <symptom>" (e.g. "denies wheezing")
  • "no <thing>" (e.g. "no asthma, COPD, or chronic lung disease", "no alcohol use")
  • "non-smoker" or "never smoker" for tobacco abstinence
- Tobacco / smoking: "Do you smoke?" + "No" / "Never" → polarity denied or absent; value
  "denies tobacco use", "non-smoker", or "never smoker" — NOT "denies never smoker".
  If the patient affirms smoking → polarity present with an appropriate use description.
- Do NOT combine "denies" with words that already negate (never, no, non-, not).
- For clinician questions followed by patient denials, include BOTH the question line_id and the answer line_id
  in source_lines. evidence_spans should quote the denial or the symptom term as it appears in those lines.

Make sure to cover all four SOAP categories when supported by the transcript:
- Subjective: symptoms, history, and other patient-reported items (asserted_by: patient)
- Objective: vitals and exam findings measured or observed by the clinician (asserted_by: clinician)
- Assessment: diagnoses and differential/diagnostic considerations stated by the clinician (asserted_by: clinician)
- Plan: medications, imaging/labs ordered, follow-up, and monitoring instructions (asserted_by: clinician)

Handle negation and temporality explicitly. Do not invent findings that are not supported by the cited lines.

Segmented lines:
${lineBlock}`;
}

export function buildStructureSoapPrompt(
  findingsSummary: string,
): string {
  return `Structure the findings below into SOAP sections.
Group by clinical relevance — assign EVERY finding to exactly the one section it best fits:
- Subjective: symptoms, history, and other patient-reported items (what the patient says or reports)
- Objective: vitals, exam findings, and lab results — measurable/observed data (not patient-reported)
- Assessment: diagnoses, differentials, and clinical impressions
- Plan: medications (new or changed), treatments, orders, follow-up, and monitoring instructions

Each finding below is prefixed with a short reference id (F1, F2, F3, ...). Each section needs a
concise clinical narrative (2-4 sentences of readable prose, not a bulleted restatement of every
finding value) and a finding_ids array containing ONLY those reference ids (e.g. "F1", "F4"),
copied EXACTLY as printed. Do not invent new ids, do not use the finding's type or value as an id,
and do not omit a finding from every section — a finding should not be dropped or left unassigned
just because it doesn't perfectly fit; assign it to the closest matching section instead.
If a section genuinely has no supporting findings, return an empty narrative and an empty
finding_ids array for that section rather than inventing content — but check carefully first, since
most consultations include at least some objective, assessment, and plan information.
Do not add information not present in the findings.

Findings:
${findingsSummary}`;
}

export function buildGenerateInsightsPrompt(
  findingsSummary: string,
  patientMemorySummary: string,
  patientDocumentsSummary: string,
): string {
  return `Generate clinical insights beyond summarization.
Prioritize safety triage (red-flag symptoms not addressed in plan) and longitudinal patterns.
Every insight must include source_lines as bare line_id values only (e.g. "<session-uuid>:L4" or
"L4"), copied from the bracketed citations in the findings below — not the full finding text.

Writing style:
- Write exclusively in clear, professional clinical English. Do not use words, characters, or
  scripts from any other language.
- Each insight summary should be 1-2 concise sentences a clinician can scan in seconds — specific
  and actionable, not a restatement of the finding list.
- Every insight needs a concrete, concise clinician_action (a specific next step), not a vague
  suggestion to "monitor" or "consider" without detail.
- Avoid duplicating the same observation across multiple insights.
- Use prior patient memory and on-file documents only for longitudinal context; cite current
  session source_lines for observations made in this visit.

Patient memory attribution (per insight):
- Set memory_context_used to true ONLY when prior patient memory (below) genuinely informed that
  specific insight — not when the insight is based solely on current session findings.
- When memory_context_used is true, you MUST provide memory_reason: 1-2 sentences of short
  clinical reasoning explaining which prior-memory fact informed the insight and how.
- Optionally set memory_fields_used to the memory sections that informed the insight (e.g.
  "active_problems", "chronic_conditions", "medications", "allergies", "recent_visits",
  "summary").
- When memory_context_used is false, set memory_reason to "" and memory_fields_used to [].
- Do NOT mark memory_context_used true just because prior memory exists — each insight must earn
  the flag independently.

Current findings:
${findingsSummary}

Prior patient memory:
${patientMemorySummary}

Prior labs/reports on file:
${patientDocumentsSummary}`;
}

export function buildUpdatePatientMemoryPrompt(input: {
  priorMemorySummary: string;
  findingsSummary: string;
  soapSummary: string;
  sessionId: string;
  patientDocumentsSummary?: string;
}): string {
  const documentsBlock = input.patientDocumentsSummary
    ? `

Prior labs/reports on file (may cite when merging memory; do not invent unstated results):
${input.patientDocumentsSummary}`
    : "";

  return `Update the patient's rolling clinical memory by merging prior memory with this session.

Rules:
- Preserve chronic conditions, allergies, and medications unless this session explicitly changes them.
- Move resolved acute problems out of active_problems; keep a brief one_liner in recent_visits.
- Append this session to recent_visits with session_id "${input.sessionId}" and a concise one_liner.
- Write summary as 2-4 sentences of readable clinical prose a doctor can scan quickly.
- Populate structured fields with concise string items (not nested objects).
- Set derived_from_session_ids to all session_ids that contributed to this memory (prior + current).
- Do not invent facts not supported by the prior memory, current session data, or on-file documents.

Prior memory:
${input.priorMemorySummary}

Current session findings:
${input.findingsSummary}

Current session SOAP:
${input.soapSummary}${documentsBlock}`;
}

export const PIPELINE_STEP_INSTRUCTIONS: Record<number, string> = {
  0: "Call extractFindings to extract grouped, readable findings with line_id citations.",
  1: "Call verifyFindings to verify cited findings against source lines.",
  2: "Call structureSoap to organize verified findings into SOAP sections.",
  3: "Call flagCompleteness to check missing fields and contradictions.",
  4: "Call loadPatientMemory to retrieve prior patient memory and symptom recurrence.",
  5: "Call loadPatientDocuments to retrieve prior labs/reports on file.",
  6: "Call generateInsights to produce actionable clinical insights.",
  7: "Call updatePatientMemory to merge this visit into patient memory.",
  8: "Call writeBack to mark the session complete.",
};

export const PIPELINE_TOOLS = [
  "extractFindings",
  "verifyFindings",
  "structureSoap",
  "flagCompleteness",
  "loadPatientMemory",
  "loadPatientDocuments",
  "generateInsights",
  "updatePatientMemory",
  "writeBack",
] as const;

export type PipelineToolName = (typeof PIPELINE_TOOLS)[number];
