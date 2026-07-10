# Presentation Prep — AI Clinical Scribe

A manager-facing briefing for showcasing this prototype. Read this before the meeting; use the demo script at the end when you present.

---

## 1. Elevator Pitch (30 seconds)

> **AI Clinical Scribe** turns a clinical visit transcript or PDF into structured documentation: extracted findings, a SOAP note, clinical insights, and an updated longitudinal patient memory — with every claim cited back to the source transcript.

**Problem it addresses:** Clinicians spend significant time writing notes after visits. Manual documentation is slow, inconsistent, and easy to miss safety-critical details across visits.

**What we built:** A Next.js prototype that ingests visit input, runs a durable multi-step AI pipeline, and produces reviewable clinical artifacts with live progress and citation linking.

**Status:** Working end-to-end prototype (not production-hardened). Suitable for demoing the workflow, architecture, and clinical value.

---

## 2. What to Say the Product Does

| Capability | One-line explanation |
|------------|----------------------|
| **Patient roster** | Searchable list of patients with session history |
| **Session creation** | Upload a PDF (or provide transcript text) for a patient visit |
| **Live pipeline** | Real-time step-by-step progress while AI processes the visit |
| **Findings** | Structured clinical facts (symptoms, meds, vitals, plans) with confidence and citations |
| **SOAP note** | Editable Subjective / Objective / Assessment / Plan narratives |
| **Insights** | Actionable observations: safety gaps, omissions, longitudinal patterns |
| **Patient memory** | Versioned longitudinal summary that grows across visits |
| **Citations** | Click a finding/insight → jump to the exact transcript line |

---

## 3. Tech Stack & Tools (know these cold)

### Core stack

| Layer | Technology | Why we chose it |
|-------|------------|-----------------|
| Framework | **Next.js 16** (App Router) | Full-stack React: UI + API in one app |
| UI | **React 19**, **Tailwind CSS 4**, **shadcn/ui** | Fast, consistent clinical UI |
| Database | **Supabase (PostgreSQL)** | Managed Postgres, simple server-side access |
| AI | **Vercel AI SDK** + **OpenAI** (`gpt-5.3-chat-latest`) | Structured outputs via `generateObject` + Zod schemas |
| Orchestration | **Vercel Workflow SDK** (`workflow`) | Durable, resumable multi-step pipelines |
| Validation | **Zod 4** | Shared schemas for DB, API, and LLM outputs |
| PDF parsing | **unpdf** | Extract text from uploaded visit PDFs |

### Supporting libraries

- `@supabase/supabase-js` — database client
- `@ai-sdk/openai` — OpenAI provider for AI SDK
- `lucide-react` / `@remixicon/react` — icons
- TypeScript throughout

### Environment / services required

| Variable | Service |
|----------|---------|
| `OPENAI_API_KEY` | OpenAI |
| `SUPABASE_URL` | Supabase project |
| `SUPABASE_SECRET_KEY` | Server-side DB access |

---

## 4. System Architecture (draw this if asked)

```
Browser (Patient list → Patient detail → Session workspace)
        │
        ▼
Next.js App (API routes + UI)
        │
        ├── POST /api/sessions  → segment transcript → start workflow
        ├── GET  /api/sessions/[id]/progress  → SSE live updates
        └── GET  /api/sessions/[id]  → full session payload
                │
                ▼
        Vercel Workflow: processSession
                │
                ├── 8 durable pipeline steps
                ├── OpenAI (LLM steps)
                └── Supabase PostgreSQL (persist everything)
```

### Request path (memorize this flow)

1. User uploads a PDF on a patient page.
2. API extracts text (`unpdf`), segments it into `source_lines`, creates a `sessions` row.
3. `processSession` workflow starts (durable).
4. UI navigates to `/session/[id]` and shows a live processing timeline via **SSE**.
5. Eight pipeline steps run; each updates progress in DB + stream.
6. On completion, UI loads findings, SOAP, insights, and patient memory.

### Data model (high level)

| Entity | Role |
|--------|------|
| `patients` | Demographics / roster |
| `sessions` | One visit run (status, SOAP, flags, metadata) |
| `source_lines` | Segmented transcript — citation backbone |
| `findings` | Structured clinical facts |
| `insights` | Actionable clinical observations |
| `patient_memory_versions` | Versioned longitudinal memory (latest = active) |

Full ER diagram and column details: see `docs/ARCHITECTURE.md`.

---

## 5. The 8-Step Clinical Pipeline

This is the heart of the demo. Know what each step does.

| # | Step | Type | What it does |
|---|------|------|--------------|
| 1 | **Extract findings** | LLM | Pull structured facts from transcript lines |
| 2 | **Verify findings** | Rules + DB | Check citations; mark verified / contradicted |
| 3 | **Structure SOAP** | LLM | Build S/O/A/P narratives linked to finding IDs |
| 4 | **Flag completeness** | Rules | Missing expected fields, contradictions, low confidence |
| 5 | **Load patient memory** | DB | Latest memory version + symptom recurrence across visits |
| 6 | **Generate insights** | LLM + Rules | Clinical insights + safety/longitudinal rule checks |
| 7 | **Update patient memory** | LLM + DB | Merge this visit into a new memory version |
| 8 | **Write back** | DB | Validate outputs; mark session `completed` |

**Pre-step (in API, before workflow):** `segmentTranscript` splits raw text into numbered source lines with speaker labels.

### Hybrid intelligence (important talking point)

Not everything is LLM:

- **LLM:** extraction, SOAP structuring, insight generation, memory merge
- **Deterministic rules:** citation verification, completeness flags, red-flag safety triage, contradiction detection, symptom recurrence

This is a strong answer if asked “How do you trust the AI?” — we combine generative AI with rule-based safety nets and source citations.

---

## 6. Key Design Decisions (manager Q&A ammo)

1. **Durable workflows** — Long LLM pipelines can fail mid-run. Vercel Workflow makes each step independently retriable and restart-safe.

2. **Citations as first-class data** — Every finding/insight links to `source_lines`. Clinicians can verify claims; verification steps can cross-check IDs.

3. **Postgres memory, not a graph DB** — Versioned `patient_memory_versions` is simpler to operate and audit than graph-RAG for this prototype.

4. **Structured outputs** — Zod schemas + `generateObject` force the model into typed JSON (findings, SOAP sections, insights), not free-form prose.

5. **JSONB for flexible artifacts** — SOAP, flags, and agent metadata can evolve without constant migrations; relational tables hold queryable facts.

6. **SSE for progress** — Clinicians see which step is running instead of a blank spinner.

---

## 7. UI Surfaces to Demo

| Screen | Path | What to show |
|--------|------|--------------|
| Patient list | `/` | Search, sort, patient cards |
| Patient detail | `/patients/[id]` | Profile, past sessions, **Create session** (PDF upload) |
| Processing | `/session/[id]` (while running) | Step timeline with live updates |
| Session workspace | `/session/[id]` (completed) | Insights → SOAP editor → transcript sheet + citations |

### Session workspace highlights

- **Insights panel** — types include `safety_triage`, `omission_risk`, `longitudinal_pattern`, `completeness`, `general`
- **SOAP editor** — clinician can edit narratives (PATCH + edit log)
- **Transcript sheet** — source lines with speaker labels; citation click-to-highlight
- **Patient memory dialogs** — view longitudinal structured memory

---

## 8. Suggested Live Demo Script (~5–7 minutes)

**Prep before the meeting**

- [ ] Dev server running (`npm run dev` / `bun dev`)
- [ ] `.env.local` has OpenAI + Supabase keys
- [ ] At least one patient exists in the DB
- [ ] Have a short sample visit PDF ready (or a known good transcript PDF)
- [ ] Optionally open a *completed* past session as a backup if live processing is slow

**Script**

1. **Open patient list** — “This is the clinician’s patient roster.” Search briefly.
2. **Open a patient** — Show demographics and prior sessions. Mention longitudinal memory builds across visits.
3. **Create session** — Upload PDF. Explain: text extraction → segmentation → durable workflow starts.
4. **Processing timeline** — Walk through the 8 steps as they light up. Emphasize durable orchestration + hybrid LLM/rules.
5. **Completed workspace**
   - Point to an **insight** (especially safety or longitudinal if present).
   - Open **SOAP** and note it’s editable.
   - Click a **citation** into the transcript — “every claim is grounded.”
   - Open **patient memory** — “this visit is merged into versioned longitudinal context.”
6. **Close** — Recap: ingest → structure → verify → document → remember → cite.

**If the live run fails:** Switch to a previously completed session and narrate the same story from finished artifacts.

---

## 9. Likely Manager Questions & Strong Answers

### “What problem does this solve?”
Documentation burden and missed longitudinal/safety signals. We automate first-draft clinical structure and surface risks the note alone might miss.

### “Is this replacing the doctor?”
No. It’s a **scribe + decision-support draft**. Clinicians review SOAP, insights, and citations before anything becomes the official record.

### “How accurate is it?”
Prototype-level. We improve trust via: structured schemas, citation verification, confidence scores, completeness flags, and rule-based safety checks — not blind free-text generation.

### “Why Next.js / this stack?”
One codebase for UI and APIs, strong TypeScript DX, Vercel Workflow for long-running AI jobs, Supabase for managed Postgres. Fast to prototype, clear path toward deployment.

### “What about PHI / HIPAA / security?”
This is a **prototype**. Production would need: auth, RLS, encryption, audit logs, BAA with vendors, no secrets in the client, retention policies, and clinical validation. Call this out honestly.

### “Can it handle multiple visits for the same patient?”
Yes — that’s the point of `patient_memory_versions`. Each completed visit can supersede prior memory and feed longitudinal insights (e.g. recurring symptoms).

### “What inputs does it accept?”
Primarily **PDF upload** in the UI today; the data model also supports `transcript` and `doctor_notes` input types.

### “What happens if a step fails mid-pipeline?”
Workflow marks the session failed (or cancelled), persists error context in agent metadata, and SSE notifies the client. Steps are designed to be durable/retriable.

### “What’s next if we productize this?”
Auth & roles, EHR integration, stronger evaluation/metrics, clinician feedback loop, production observability, compliance hardening, and possibly voice/dictation input.

---

## 10. Strengths to Emphasize

- End-to-end working loop: upload → process → review
- Transparent pipeline (live steps, not a black box)
- Citations and verification (grounding)
- Hybrid AI + rules (safety / completeness)
- Longitudinal patient memory across visits
- Editable SOAP with edit logging
- Clean separation: API, workflow, tools, DB, UI

---

## 11. Honest Limitations (say these before you’re asked)

- Prototype — not production security/compliance ready
- Depends on OpenAI availability, cost, and latency
- PDF quality / messy transcripts affect extraction quality
- Limited visit-type completeness rules (mainly outpatient / urgent care templates)
- No full auth / multi-tenant access control in the demo UI
- Clinical correctness still requires human review

---

## 12. Project Map (if they ask “where is the code?”)

```
app/                  Pages + API routes
agent/                Pipeline orchestration + prompts + step tools
workflows/            Vercel Workflow entry (processSession)
lib/                  DB, schemas, decisions, adapters, PDF, AI model
components/clinical/  Domain UI (SOAP, insights, transcript, timeline)
supabase/migrations/  PostgreSQL schema
docs/ARCHITECTURE.md  Deep technical reference
```

---

## 13. One-Slide Mental Model

**Input:** Visit PDF / transcript  
**Process:** Durable 8-step AI + rules pipeline  
**Output:** Findings + SOAP + Insights + Updated patient memory  
**Trust layer:** Citations, verification, confidence, completeness flags  

---

## 14. Quick Cheat Sheet (print / keep open)

| Topic | Answer |
|-------|--------|
| Product name | AI Clinical Scribe |
| Framework | Next.js 16 + React 19 |
| DB | Supabase PostgreSQL |
| AI | Vercel AI SDK + OpenAI `gpt-5.3-chat-latest` |
| Orchestration | Vercel Workflow SDK |
| Pipeline steps | 8 (extract → verify → SOAP → completeness → memory load → insights → memory update → write-back) |
| Live updates | Server-Sent Events (SSE) |
| Key differentiator | Citations + hybrid rules + longitudinal memory |
| Status | Working prototype |

---

*Deeper technical detail:* [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)
