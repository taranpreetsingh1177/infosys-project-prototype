import type { SessionView } from "@/lib/types/session";

export const RAJESH_SHARMA_SESSION: SessionView = {
  id: "demo",
  patient_id: "demo-patient",
  status: "complete",
  patient_name: "Rajesh Sharma",
  visit_date: "2026-06-30",
  visit_type: "Follow-up",
  transcript: `Doctor: Good morning, Mr. Sharma. What brings you in today?
Patient: I've been feeling unwell for a few weeks now.
Doctor: Can you describe your symptoms?
Patient: I've been feeling very tired for the past 3 weeks.
Doctor: Any other symptoms?
Patient: Yes, I feel dizzy when I stand up quickly.
Patient: I also get headaches sometimes.
Doctor: Let me examine you and order some tests.`,
  source_lines: [
    { line_id: "L1", speaker: "doctor", text: "Good morning, Mr. Sharma. What brings you in today?" },
    { line_id: "L2", speaker: "patient", text: "I've been feeling unwell for a few weeks now." },
    { line_id: "L3", speaker: "doctor", text: "Can you describe your symptoms?" },
    { line_id: "L4", speaker: "patient", text: "I've been feeling very tired for the past 3 weeks." },
    { line_id: "L5", speaker: "doctor", text: "Any other symptoms?" },
    { line_id: "L6", speaker: "patient", text: "Yes, I feel dizzy when I stand up quickly." },
    { line_id: "L7", speaker: "patient", text: "I also get headaches sometimes." },
    { line_id: "L8", speaker: "doctor", text: "Let me examine you and order some tests." },
  ],
  soap: [
    {
      key: "subjective",
      title: "Subjective",
      findings: [
        { id: "sub-1", section: "subjective", text: "Reports fatigue for the past 3 weeks", category: "symptom", highlight_text: "fatigue for the past 3 weeks", source_line_ids: ["L4", "L7"], verified: true, confidence: "high" },
        { id: "sub-2", section: "subjective", text: "Dizziness on standing", category: "symptom", source_line_ids: ["L6"], verified: true, confidence: "high" },
        { id: "sub-3", section: "subjective", text: "Occasional headaches", category: "symptom", source_line_ids: ["L7"], verified: true, confidence: "high" },
      ],
    },
    {
      key: "objective",
      title: "Objective",
      findings: [
        { id: "obj-1", section: "objective", text: "BP: 118/72 mmHg, Temp: 36.8°C, SpO2: 98%", category: "objective", source_line_ids: [], verified: true, confidence: "high" },
        { id: "obj-3", section: "objective", text: "Hb: 9.8 g/dL (low)", category: "lab", highlight_text: "Hb: 9.8 g/dL (low)", source_line_ids: [], verified: true, confidence: "high" },
      ],
    },
    {
      key: "assessment",
      title: "Assessment",
      findings: [
        { id: "ass-1", section: "assessment", text: "Iron deficiency anemia", category: "assessment", highlight_text: "Iron deficiency anemia", source_line_ids: [], verified: true, confidence: "high" },
      ],
    },
    {
      key: "plan",
      title: "Plan",
      findings: [
        { id: "plan-1", section: "plan", text: "Iron supplementation", category: "plan", source_line_ids: [], verified: true, confidence: "high" },
        { id: "plan-2", section: "plan", text: "Follow-up in 4 weeks", category: "plan", source_line_ids: [], verified: true, confidence: "high" },
      ],
    },
  ],
  insights: [
    {
      id: "ins-1",
      type: "omission_risk",
      title: "Omission Risk",
      description:
        "No documentation of menstrual history or recent dietary changes.",
      source_count: 3,
      source_line_ids: ["L4", "L6", "L7"],
    },
    {
      id: "ins-2",
      type: "longitudinal_pattern",
      title: "Longitudinal Pattern",
      description: "Fatigue reported across 3 visits in the past 6 months.",
      source_count: 2,
      source_line_ids: ["L4", "L7"],
    },
  ],
  agent_metadata: { confidence: "high", last_generated: "just now", clinician_edits: 0, verified: true },
};

export const MOCK_PATIENTS = [
  {
    patient_id: "demo-patient",
    name: "Rajesh Sharma",
    session_count: 0,
    last_session_at: null,
    date_of_birth: "1978-03-15",
    mrn: "MRN-10042",
    phone: "+91 98765 43210",
    email: "rajesh.sharma@email.com",
    gender: "male" as const,
    status: "active" as const,
    updated_at: "2026-06-30T09:40:00Z",
    recent_sessions: [],
  },
  {
    patient_id: "patient-priya",
    name: "Priya Nair",
    session_count: 0,
    last_session_at: null,
    date_of_birth: "1985-11-02",
    mrn: "MRN-10087",
    phone: "+91 98234 56789",
    email: "priya.nair@email.com",
    gender: "female" as const,
    status: "active" as const,
    updated_at: "2026-05-12T11:35:00Z",
    recent_sessions: [],
  },
  {
    patient_id: "patient-amit",
    name: "Amit Patel",
    session_count: 0,
    last_session_at: null,
    date_of_birth: "1990-07-22",
    mrn: "MRN-10103",
    phone: "+91 97654 32109",
    email: "amit.patel@email.com",
    gender: "male" as const,
    status: "new" as const,
    updated_at: "2026-01-01T00:00:00Z",
    recent_sessions: [],
  },
];
