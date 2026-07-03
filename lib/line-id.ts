import type { SourceLine } from "@/lib/types/session";

/** Visible transcript label, e.g. `{sessionId}:L4` → `L4`. */
export function lineIdSuffix(id: string): string {
  return id.split(":").pop() ?? id;
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
    const id = rawId.trim();
    if (!id) continue;

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

  return [...new Set(resolved)];
}
