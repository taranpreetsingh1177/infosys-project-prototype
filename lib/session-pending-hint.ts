import type { SessionStatus, SessionView } from "@/lib/types/session";

const STORAGE_PREFIX = "session-pending:";

export interface SessionPendingHint {
  patientId: string;
  patientName?: string;
  status?: SessionStatus;
}

const memoryHints = new Map<string, SessionPendingHint>();

function storageKey(sessionId: string) {
  return `${STORAGE_PREFIX}${sessionId}`;
}

export function writeSessionPendingHint(
  sessionId: string,
  hint: SessionPendingHint,
): void {
  memoryHints.set(sessionId, hint);
  try {
    sessionStorage.setItem(storageKey(sessionId), JSON.stringify(hint));
  } catch {
    // sessionStorage may be unavailable in some environments
  }
}

export function peekSessionPendingHint(
  sessionId: string,
): SessionPendingHint | null {
  const cached = memoryHints.get(sessionId);
  if (cached) return cached;

  try {
    const raw = sessionStorage.getItem(storageKey(sessionId));
    if (!raw) return null;
    const hint = JSON.parse(raw) as SessionPendingHint;
    memoryHints.set(sessionId, hint);
    return hint;
  } catch {
    return null;
  }
}

/** @deprecated Use peekSessionPendingHint — kept for compatibility */
export function readSessionPendingHint(
  sessionId: string,
): SessionPendingHint | null {
  return peekSessionPendingHint(sessionId);
}

export function clearSessionPendingHint(sessionId: string): void {
  memoryHints.delete(sessionId);
  try {
    sessionStorage.removeItem(storageKey(sessionId));
  } catch {
    // sessionStorage may be unavailable in some environments
  }
}

export function pendingHintToSessionView(
  sessionId: string,
  hint: SessionPendingHint,
): SessionView {
  return {
    id: sessionId,
    patient_id: hint.patientId,
    patient_name: hint.patientName ?? "Patient",
    status: hint.status ?? "processing",
    visit_date: new Date().toISOString().slice(0, 10),
    transcript: "",
    source_lines: [],
    soap: [],
    insights: [],
    agent_metadata: {
      confidence: "low",
      last_generated: new Date().toISOString(),
      clinician_edits: 0,
      verified: false,
    },
  };
}
