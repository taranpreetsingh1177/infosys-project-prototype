import { NextResponse } from "next/server";
import { listPatients } from "@/lib/db";

export async function GET() {
  try {
    const patients = await listPatients();
    return NextResponse.json({ patients });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list patients";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
