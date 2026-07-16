import { NextResponse } from "next/server";

import { buildPatientPacket } from "@/lib/export/patient-packet-data";
import { renderPatientPacketPdf } from "@/lib/export/patient-packet-pdf";
import {
  getPatientMemoryBySourceSession,
  getSessionDetail,
} from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function safeFilenamePart(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format")?.toLowerCase();

    if (format !== "pdf" && format !== "json") {
      return NextResponse.json(
        { error: "Query param format must be 'pdf' or 'json'" },
        { status: 400 },
      );
    }

    const detail = await getSessionDetail(id);
    if (!detail) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (detail.session.status !== "completed") {
      return NextResponse.json(
        { error: "Export is only available for completed sessions" },
        { status: 409 },
      );
    }

    const patientLabel = safeFilenamePart(
      detail.patient?.name ?? detail.session.patient_id,
    );
    const dateLabel = detail.session.created_at.slice(0, 10);

    if (format === "json") {
      const memory =
        (await getPatientMemoryBySourceSession(id)) ??
        detail.session.agent_metadata?.patient_memory ??
        null;

      const payload = {
        ...detail,
        memory,
      };

      return new NextResponse(JSON.stringify(payload, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="session-${safeFilenamePart(id)}-${dateLabel}.json"`,
        },
      });
    }

    const packet = buildPatientPacket(detail);
    const buffer = await renderPatientPacketPdf(packet);

    const filename = `visit-summary-${patientLabel}-${dateLabel}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to export session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
