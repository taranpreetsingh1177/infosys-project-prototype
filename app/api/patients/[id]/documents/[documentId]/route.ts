import { NextResponse } from "next/server";
import {
  deletePatientDocument,
  downloadPatientDocumentFile,
  getPatient,
  getPatientDocument,
} from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string; documentId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id: patientId, documentId } = await context.params;
    const patient = await getPatient(patientId);
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const document = await getPatientDocument(documentId);
    if (!document || document.patient_id !== patientId) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const blob = await downloadPatientDocumentFile(document.storage_path);
    const bytes = Buffer.from(await blob.arrayBuffer());

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": document.mime_type,
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(document.title)}"`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to download document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id: patientId, documentId } = await context.params;
    const patient = await getPatient(patientId);
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const existing = await getPatientDocument(documentId);
    if (!existing || existing.patient_id !== patientId) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await deletePatientDocument(documentId);
    return NextResponse.json({ ok: true, document_id: documentId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
