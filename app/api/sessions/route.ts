import { start } from "workflow/api";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { segmentTranscriptTool } from "@/agent/tools/segmentTranscript";
import {
  createSession,
  getPatient,
  getSourceLines,
  insertSourceLines,
  listSessions,
  updateSession,
} from "@/lib/db";
import { extractTextFromPdf } from "@/lib/pdf";
import { CreateSessionRequestSchema } from "@/lib/schema";
import { processSession } from "@/workflows/process-session";

async function startSessionPipeline(
  sessionId: string,
  visitType: string,
) {
  const run = await start(processSession, [{ sessionId, visitType }]);
  await updateSession(sessionId, {
    workflow_run_id: run.runId,
    status: "processing",
  });
  return run.runId;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      const patientId = String(formData.get("patient_id") ?? "");
      const visitType = String(
        formData.get("visit_type") ?? "general_adult_outpatient",
      );

      if (!(file instanceof File)) {
        return NextResponse.json({ error: "PDF file is required" }, { status: 400 });
      }

      if (!patientId) {
        return NextResponse.json(
          { error: "patient_id is required" },
          { status: 400 },
        );
      }

      const patient = await getPatient(patientId);
      if (!patient) {
        return NextResponse.json({ error: "Patient not found" }, { status: 404 });
      }

      const buffer = await file.arrayBuffer();
      const rawText = await extractTextFromPdf(buffer);
      const sessionId = crypto.randomUUID();

      const session = await createSession({
        session_id: sessionId,
        patient_id: patientId,
        visit_type: visitType,
        input_type: "pdf",
        status: "pending",
        workflow_run_id: null,
        agent_metadata: { edit_log: [] },
      });

      const sourceLines = await segmentTranscriptTool({
        sessionId,
        inputType: "pdf",
        rawText,
      });
      await insertSourceLines(sourceLines);

      const workflowRunId = await startSessionPipeline(sessionId, visitType);

      return NextResponse.json(
        {
          session_id: sessionId,
          workflow_run_id: workflowRunId,
          source_line_count: sourceLines.length,
          status: "processing",
          session,
        },
        { status: 201 },
      );
    }

    const body = await request.json();
    const parsed = CreateSessionRequestSchema.parse(body);
    const sessionId = crypto.randomUUID();

    const patient = await getPatient(parsed.patient_id);
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const session = await createSession({
      session_id: sessionId,
      patient_id: parsed.patient_id,
      visit_type: parsed.visit_type,
      input_type: parsed.input_type,
      status: "pending",
      workflow_run_id: null,
      agent_metadata: { edit_log: [] },
    });

    let sourceLines = await getSourceLines(sessionId);
    if (sourceLines.length === 0) {
      sourceLines = await segmentTranscriptTool({
        sessionId,
        inputType: parsed.input_type,
        rawText: parsed.raw_text,
      });
      await insertSourceLines(sourceLines);
    }

    const workflowRunId = await startSessionPipeline(sessionId, parsed.visit_type);

    return NextResponse.json(
      {
        session_id: sessionId,
        workflow_run_id: workflowRunId,
        source_line_count: sourceLines.length,
        status: "processing",
        session,
      },
      { status: 201 },
    );
  } catch (error) {
    const status = error instanceof ZodError ? 400 : 500;
    const message =
      error instanceof Error ? error.message : "Failed to create session";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "20");
    const sessions = await listSessions(Number.isFinite(limit) ? limit : 20);
    return NextResponse.json({ sessions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list sessions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
