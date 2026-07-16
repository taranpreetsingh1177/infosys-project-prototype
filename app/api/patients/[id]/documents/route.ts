import { NextResponse } from "next/server";
import {
  createPatientDocument,
  getPatient,
  listPatientDocuments,
  uploadPatientDocumentFile,
} from "@/lib/db";
import {
  extractPatientDocumentText,
  isAllowedPatientDocumentMime,
  summarizePatientDocumentText,
} from "@/lib/patient-documents";
import { PatientDocumentTypeSchema } from "@/lib/schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id: patientId } = await context.params;
    const patient = await getPatient(patientId);
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const documents = await listPatientDocuments(patientId);
    return NextResponse.json({ documents });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list documents";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: patientId } = await context.params;
    const patient = await getPatient(patientId);
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const titleRaw = String(formData.get("title") ?? "").trim();
    const docTypeRaw = String(formData.get("doc_type") ?? "other").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "file is empty" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "file exceeds 20MB limit" },
        { status: 400 },
      );
    }

    const mimeType = file.type || "application/octet-stream";
    if (!isAllowedPatientDocumentMime(mimeType, file.name)) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Upload a PDF or common image (JPEG, PNG, WebP, GIF).",
        },
        { status: 400 },
      );
    }

    const docTypeParsed = PatientDocumentTypeSchema.safeParse(docTypeRaw);
    if (!docTypeParsed.success) {
      return NextResponse.json(
        {
          error:
            "doc_type must be one of: lab, imaging, referral, discharge, other",
        },
        { status: 400 },
      );
    }

    const documentId = crypto.randomUUID();
    const safeName = file.name.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 120);
    const storagePath = `${patientId}/${documentId}-${safeName || "document"}`;
    const title =
      titleRaw ||
      file.name.replace(/\.[^.]+$/, "").trim() ||
      "Untitled document";

    const buffer = await file.arrayBuffer();
    await uploadPatientDocumentFile({
      storagePath,
      body: buffer,
      contentType: mimeType,
    });

    const extractedText = await extractPatientDocumentText({
      buffer,
      mimeType,
      fileName: file.name,
    });

    const summary = extractedText
      ? await summarizePatientDocumentText({
          title,
          docType: docTypeParsed.data,
          extractedText,
        })
      : mimeType.startsWith("image/")
        ? "Image document uploaded; OCR not available in v1."
        : null;

    const document = await createPatientDocument({
      documentId,
      patientId,
      title,
      docType: docTypeParsed.data,
      mimeType,
      storagePath,
      byteSize: file.size,
      extractedText,
      summary,
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
