/**
 * NegEx-style clinical negation detection.
 * Detects whether an utterance expresses negation of clinical content.
 */

/** Longer phrases first so they match before shorter prefixes. */
const NEGATION_PHRASES = [
  "no evidence of",
  "no known history of",
  "no history of",
  "no complaints of",
  "no signs of",
  "no symptoms of",
  "negative for",
  "ruled out for",
  "ruled out",
  "rule out",
  "rules out",
  "free of",
  "absence of",
  "absent of",
  "without any",
  "without",
  "denies any",
  "denies",
  "denied any",
  "denied",
  "deny any",
  "deny",
  "denying",
  "never had",
  "never been",
  "has never",
  "have never",
  "had never",
  "not having",
  "not have",
  "does not have",
  "do not have",
  "doesn't have",
  "don't have",
  "didn't have",
  "did not have",
  "hasn't had",
  "haven't had",
  "hadn't had",
  "has not had",
  "have not had",
  "had not had",
  "isn't having",
  "aren't having",
  "not experiencing",
  "no longer",
  "neither",
  "nor any",
] as const;

const NEGATION_CONTRACTIONS = [
  "don't",
  "doesn't",
  "didn't",
  "haven't",
  "hasn't",
  "hadn't",
  "isn't",
  "aren't",
  "wasn't",
  "weren't",
  "won't",
  "can't",
  "couldn't",
  "wouldn't",
  "shouldn't",
] as const;

const UNCERTAINTY_PHRASES = [
  "not sure",
  "not certain",
  "unsure",
  "uncertain",
  "maybe",
  "might be",
  "might have",
  "possibly",
  "possible",
  "probably",
  "i think",
  "i believe",
  "kind of",
  "sort of",
  "somewhat",
  "occasional",
  "occasionally",
  "sometimes",
  "intermittent",
  "unclear",
] as const;

function normalizeNegexText(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * True when the text is a short standalone negation answer
 * (e.g. "No", "Nope", "Never").
 */
export function isStandaloneNegation(text: string): boolean {
  const normalized = normalizeNegexText(text).replace(/[.!,;:]+$/g, "");
  if (!normalized) return false;
  return /^(no|nope|nah|never|none|nothing|negative)$/.test(normalized);
}

/**
 * True when the utterance contains a NegEx-style negation trigger.
 * Suitable for patient answers and clinician statements like "denies wheezing".
 *
 * Prefer {@link isContentNegated} when checking whether a specific finding
 * phrase is under negation scope inside a longer mixed utterance.
 */
export function isNegated(text: string): boolean {
  const normalized = normalizeNegexText(text);
  if (!normalized) return false;

  if (isStandaloneNegation(normalized)) return true;

  for (const phrase of NEGATION_PHRASES) {
    if (
      normalized === phrase ||
      normalized.startsWith(`${phrase} `) ||
      normalized.includes(` ${phrase} `) ||
      normalized.endsWith(` ${phrase}`)
    ) {
      return true;
    }
  }

  for (const contraction of NEGATION_CONTRACTIONS) {
    if (
      normalized.startsWith(`${contraction} `) ||
      normalized.includes(` ${contraction} `)
    ) {
      return true;
    }
  }

  // Leading "no <…>" answers / statements
  if (/^no\b/.test(normalized)) return true;

  // "not" + common clinical verbs/auxiliaries
  if (
    /\bnot\b/.test(normalized) &&
    /\b(have|has|had|any|a|an|the|really|actually|been|feeling|experiencing)\b/.test(
      normalized,
    )
  ) {
    return true;
  }

  return false;
}

/**
 * True when `content` falls under NegEx scope in `text` (trigger precedes the
 * content within a short window), or when the whole utterance is a short denial.
 */
export function isContentNegated(text: string, content: string): boolean {
  const normalized = normalizeNegexText(text);
  if (!normalized) return false;
  if (isStandaloneNegation(normalized)) return true;

  const contentNorm = normalizeNegexText(content).replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim();
  if (!contentNorm) return isNegated(text);

  const contentIdx = normalized.indexOf(contentNorm);
  // If we can't locate the content, fall back to whole-utterance negation —
  // but only for short answers where scope is unambiguous.
  if (contentIdx < 0) {
    const tokenCount = normalized.split(/\s+/).length;
    return tokenCount <= 6 && isNegated(normalized);
  }

  const before = normalized.slice(Math.max(0, contentIdx - 48), contentIdx);
  for (const phrase of NEGATION_PHRASES) {
    if (
      before.endsWith(`${phrase} `) ||
      before.endsWith(phrase) ||
      before.includes(` ${phrase} `)
    ) {
      return true;
    }
  }
  for (const contraction of NEGATION_CONTRACTIONS) {
    if (before.endsWith(`${contraction} `) || before.includes(` ${contraction} `)) {
      return true;
    }
  }
  if (/\bno\s+$/.test(before) || /\bnot\s+$/.test(before)) return true;

  return false;
}

/** True when the text expresses clinical uncertainty rather than firm affirmation/negation. */
export function isUncertainLanguage(text: string): boolean {
  const normalized = normalizeNegexText(text);
  if (!normalized) return false;
  return UNCERTAINTY_PHRASES.some(
    (phrase) =>
      normalized === phrase ||
      normalized.startsWith(`${phrase} `) ||
      normalized.includes(` ${phrase} `) ||
      normalized.endsWith(` ${phrase}`),
  );
}

/**
 * True when a clinician utterance is phrased as a question
 * (or a screening stem that expects a yes/no answer).
 */
export function isClinicianQuestion(text: string): boolean {
  const normalized = normalizeNegexText(text);
  if (!normalized) return false;
  if (normalized.includes("?")) return true;
  return /^(have you|do you|did you|are you|is there|have there|any |does he|does she|has he|has she|can you|could you|would you)/.test(
    normalized,
  );
}
