import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, getSessionDetail, updateSession } from "@/lib/db";
import { EditLogEntrySchema } from "@/lib/schema";

const PatchSessionSchema = z.object({
  edit_log_entry: EditLogEntrySchema.optional(),
  soap: z
    .object({
      subjective: z.object({ narrative: z.string() }).optional(),
      objective: z.object({ narrative: z.string() }).optional(),
      assessment: z.object({ narrative: z.string() }).optional(),
      plan: z.object({ narrative: z.string() }).optional(),
    })
    .optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const detail = await getSessionDetail(id);

    if (!detail) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const session = await getSession(id);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const body = PatchSessionSchema.parse(await request.json());
    const editLog = session.agent_metadata?.edit_log ?? [];

    if (body.edit_log_entry) {
      editLog.push(body.edit_log_entry);
    }

    const updates: Parameters<typeof updateSession>[1] = {
      agent_metadata: {
        ...session.agent_metadata,
        edit_log: editLog,
      },
    };

    if (body.soap) {
      const mergeSection = (
        existing: { narrative: string; finding_ids?: string[] } | undefined,
        patch: { narrative: string } | undefined,
      ): { narrative: string; finding_ids: string[] } | undefined => {
        if (!patch) {
          return existing
            ? {
                narrative: existing.narrative,
                finding_ids: existing.finding_ids ?? [],
              }
            : undefined;
        }
        return {
          narrative: patch.narrative,
          finding_ids: existing?.finding_ids ?? [],
        };
      };

      updates.soap = {
        subjective: mergeSection(session.soap?.subjective, body.soap.subjective),
        objective: mergeSection(session.soap?.objective, body.soap.objective),
        assessment: mergeSection(session.soap?.assessment, body.soap.assessment),
        plan: mergeSection(session.soap?.plan, body.soap.plan),
      };

      if (body.edit_log_entry == null) {
        editLog.push({
          field: "soap",
          old_value: session.soap ?? null,
          new_value: updates.soap,
          edited_at: new Date().toISOString(),
        });
      }
    }

    const updated = await updateSession(id, updates);
    return NextResponse.json({ session: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update session";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
