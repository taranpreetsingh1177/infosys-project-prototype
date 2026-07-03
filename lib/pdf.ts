import { extractText, getDocumentProxy } from "unpdf";

/**
 * unpdf's `mergePages: true` option internally collapses ALL whitespace
 * (including newlines) into single spaces, which destroys dialogue/line
 * structure and turns a multi-turn transcript into one giant blob. That in
 * turn breaks speaker segmentation downstream. We request per-page text
 * instead (which preserves PDF.js's `hasEOL` line breaks) and do our own,
 * more conservative normalization that keeps line breaks intact.
 */
export async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [text];
  const normalized = normalizeExtractedText(pages.join("\n\n"));

  if (!normalized) {
    throw new Error(
      "No extractable text found in PDF. Scanned image PDFs require OCR and are not supported yet.",
    );
  }

  return normalized;
}

/**
 * Cleans up raw PDF.js text output without destroying paragraph/line
 * structure: normalizes line endings, collapses runs of horizontal
 * whitespace within a line, trims each line, and collapses runs of blank
 * lines down to a single separator.
 */
export function normalizeExtractedText(rawText: string): string {
  const lines = rawText
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim());

  const collapsed: string[] = [];
  for (const line of lines) {
    if (line.length === 0 && collapsed[collapsed.length - 1] === "") {
      continue;
    }
    collapsed.push(line);
  }

  return collapsed.join("\n").trim();
}
