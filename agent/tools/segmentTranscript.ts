import type { InputType, SourceLine } from "@/lib/schema";

function makeLineId(sessionId: string, index: number): string {
  return `${sessionId}:L${index + 1}`;
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

interface SpeakerTurn {
  speaker: string;
  text: string;
}

/**
 * Matches a speaker label at the start of a line, e.g. "Doctor: ..." or
 * "Dr. Sharma: ...". This is the primary, low-false-positive strategy used
 * when the transcript has real line breaks per speaker turn.
 */
const ANCHORED_SPEAKER_PATTERN =
  /(?:^|\n)[ \t]*([A-Z][A-Za-z][A-Za-z0-9 ._'-]{0,40}):[ \t]+/g;

/**
 * Looser fallback that doesn't require a line break before the speaker
 * label. Needed for PDF extractions that collapse all dialogue onto a
 * single line/paragraph (no newlines at all). Requiring the label to start
 * with an uppercase letter and excluding sentence-terminating/separating
 * punctuation (., ?, !, ,) from the label body keeps this from matching
 * across a preceding sentence into an unrelated capitalized word.
 */
const LOOSE_SPEAKER_PATTERN = /\b([A-Z][A-Za-z0-9 '-]{0,24}):[ \t]+(?=\S)/g;

function splitBySpeakerTurns(
  rawText: string,
  pattern: RegExp,
): SpeakerTurn[] {
  const matches = [...rawText.matchAll(pattern)];
  if (matches.length < 2) return [];

  const turns: SpeakerTurn[] = [];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const matchIndex = match.index ?? 0;
    const start = matchIndex + match[0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? rawText.length) : rawText.length;
    const text = collapseWhitespace(rawText.slice(start, end));
    if (text) {
      turns.push({ speaker: match[1].trim(), text });
    }
  }
  return turns;
}

function turnsToSourceLines(
  turns: SpeakerTurn[],
  sessionId: string,
): SourceLine[] {
  return turns.map((turn, index) => ({
    line_id: makeLineId(sessionId, index),
    session_id: sessionId,
    speaker: turn.speaker,
    text: turn.text,
    sequence: index,
  }));
}

function segmentTranscript(rawText: string, sessionId: string): SourceLine[] {
  let turns = splitBySpeakerTurns(rawText, ANCHORED_SPEAKER_PATTERN);
  if (turns.length < 2) {
    turns = splitBySpeakerTurns(rawText, LOOSE_SPEAKER_PATTERN);
  }

  if (turns.length > 0) {
    return turnsToSourceLines(turns, sessionId);
  }

  const fallbackText = collapseWhitespace(rawText);
  if (!fallbackText) return [];

  return [
    {
      line_id: makeLineId(sessionId, 0),
      session_id: sessionId,
      speaker: "Unknown",
      text: fallbackText,
      sequence: 0,
    },
  ];
}

function segmentDoctorNotes(rawText: string, sessionId: string): SourceLine[] {
  const clauses = rawText
    .split(/(?<=[.!?])\s+|\n+/)
    .map((clause) => clause.trim())
    .filter(Boolean);

  return clauses.map((text, index) => ({
    line_id: makeLineId(sessionId, index),
    session_id: sessionId,
    speaker: "Clinician",
    text,
    sequence: index,
  }));
}

export async function segmentTranscriptTool(input: {
  sessionId: string;
  inputType: InputType;
  rawText: string;
}): Promise<SourceLine[]> {
  "use step";

  const { sessionId, inputType, rawText } = input;

  if (inputType === "transcript" || inputType === "pdf") {
    return segmentTranscript(rawText, sessionId);
  }

  return segmentDoctorNotes(rawText, sessionId);
}
