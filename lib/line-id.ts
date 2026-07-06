import type { SourceLine } from "@/lib/types/session";

const FULL_LINE_ID =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:L\d+/gi;
const LINE_SUFFIX = /\bL\d+\b/g;

/** Visible transcript label, e.g. `{sessionId}:L4` → `L4`. */
export function lineIdSuffix(id: string): string {
  return id.split(":").pop() ?? id;
}

/**
 * Pull line_id references out of a citation value. LLM insight output often
 * copies entire finding summary lines (with bracketed ids) instead of bare
 * line_id strings.
 */
export function extractLineIdReferences(cited: string): string[] {
  const trimmed = cited.trim();
  if (!trimmed) return [];

  const fullMatches = trimmed.match(FULL_LINE_ID);
  if (fullMatches?.length) {
    return fullMatches;
  }

  const suffixMatches = trimmed.match(LINE_SUFFIX);
  if (suffixMatches?.length) {
    return suffixMatches;
  }

  return [trimmed];
}

/** True when two line ids refer to the same transcript row. */
export function lineIdsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  return lineIdSuffix(a) === lineIdSuffix(b);
}

export function activeLineIdsInclude(
  activeLineIds: string[],
  lineId: string,
): boolean {
  return activeLineIds.some((activeId) => lineIdsMatch(activeId, lineId));
}

/**
 * Map cited ids (exact or suffix, e.g. `L4`) to canonical `line_id` values
 * from the session's source lines.
 */
export function resolveSourceLineIds(
  citedIds: string[],
  lines: SourceLine[],
): string[] {
  const byId = new Map(lines.map((line) => [line.line_id, line.line_id]));
  const bySuffix = new Map(
    lines.map((line) => [lineIdSuffix(line.line_id), line.line_id]),
  );

  const resolved: string[] = [];
  for (const rawId of citedIds) {
    for (const id of extractLineIdReferences(rawId)) {
      const exact = byId.get(id);
      if (exact) {
        resolved.push(exact);
        continue;
      }

      const suffix = lineIdSuffix(id);
      const bySuffixMatch = bySuffix.get(suffix);
      if (bySuffixMatch) {
        resolved.push(bySuffixMatch);
      }
    }
  }

  return [...new Set(resolved)];
}
