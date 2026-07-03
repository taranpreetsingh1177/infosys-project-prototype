import { NextResponse } from "next/server";
import { getPatient, listSessionsByPatient } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const patient = await getPatient(id);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const sessions = await listSessionsByPatient(id);
    return NextResponse.json({ patient, sessions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch patient";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
