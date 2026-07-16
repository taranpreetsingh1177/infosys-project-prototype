import { generateObject } from "ai";
import { z } from "zod";
import { clinicalScribeModel } from "@/lib/ai";
import { extractTextFromPdf } from "@/lib/pdf";

const DocumentSummarySchema = z.object({
  summary: z
    .string()
    .describe(
      "1-3 sentence clinical summary of the document for a doctor scanning the chart",
    ),
});

export function isPdfMimeType(mimeType: string, fileName?: string): boolean {
  if (mimeType === "application/pdf") return true;
  return Boolean(fileName?.toLowerCase().endsWith(".pdf"));
}

export function isAllowedPatientDocumentMime(
  mimeType: string,
  fileName?: string,
): boolean {
  if (isPdfMimeType(mimeType, fileName)) return true;
  return (
    mimeType.startsWith("image/") &&
    [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/heic",
      "image/heif",
    ].includes(mimeType)
  );
}

export async function extractPatientDocumentText(params: {
  buffer: ArrayBuffer;
  mimeType: string;
  fileName?: string;
}): Promise<string | null> {
  if (!isPdfMimeType(params.mimeType, params.fileName)) {
    return null;
  }

  try {
    return await extractTextFromPdf(params.buffer);
  } catch {
    // Scanned/image PDFs or empty text layers — keep row without text in v1.
    return null;
  }
}

export async function summarizePatientDocumentText(params: {
  title: string;
  docType: string;
  extractedText: string;
}): Promise<string | null> {
  const clipped = params.extractedText.slice(0, 12_000).trim();
  if (!clipped) return null;

  try {
    const { object } = await generateObject({
      model: clinicalScribeModel,
      schema: DocumentSummarySchema,
      prompt: `Summarize this clinical document for a physician chart review.
Title: ${params.title}
Document type: ${params.docType}

Document text:
${clipped}`,
    });
    return object.summary.trim() || null;
  } catch {
    // Heuristic fallback if the model is unavailable.
    const first = clipped.split(/\n+/).find((line) => line.trim().length > 20);
    return first ? first.trim().slice(0, 280) : clipped.slice(0, 280);
  }
}

export function buildPatientDocumentsPromptSummary(
  documents: Array<{
    title: string;
    doc_type: string;
    summary?: string | null;
    extracted_text?: string | null;
  }>,
  textTruncate = 2000,
): string {
  if (documents.length === 0) {
    return "No prior labs/reports on file.";
  }

  return documents
    .map((doc, index) => {
      const summary =
        doc.summary?.trim() ||
        (doc.extracted_text
          ? doc.extracted_text.trim().slice(0, textTruncate)
          : "No extractable text.");
      return `${index + 1}. [${doc.doc_type}] ${doc.title}\n${summary}`;
    })
    .join("\n\n");
}
