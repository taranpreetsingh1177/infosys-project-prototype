import { getRun } from "workflow/api";

import { getSession } from "@/lib/db";
import type { PipelineStepId } from "@/lib/pipeline-steps";
import {
  PIPELINE_STREAM_NAMESPACE,
  type PipelineStreamEvent,
  pipelineStreamToSSE,
} from "@/lib/pipeline-stream";
import { persistSessionFailure } from "@/lib/session-failure";
import type { PipelineProgress } from "@/lib/types/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function progressFromSession(
  agentMetadata:
    | NonNullable<Awaited<ReturnType<typeof getSession>>>["agent_metadata"]
    | undefined,
): PipelineProgress {
  const progress = agentMetadata?.pipeline_progress;
  return {
    current_step: progress?.current_step ?? null,
    completed_steps: progress?.completed_steps ?? [],
    failed_step: progress?.failed_step,
    error_message: progress?.error_message,
  };
}

function terminalEventFromSession(
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>,
): PipelineStreamEvent {
  const progress = progressFromSession(session.agent_metadata);

  if (session.status === "failed") {
    return {
      type: "failed",
      stepId: progress.failed_step ?? null,
      errorMessage: progress.error_message ?? "Pipeline failed",
      progress,
      status: "error",
    };
  }

  if (session.status === "completed") {
    return {
      type: "done",
      progress,
      status: "complete",
    };
  }

  return {
    type: "init",
    progress,
    status: "processing",
  };
}

function isActiveSessionStatus(status: string) {
  return status === "pending" || status === "processing";
}

async function reconcileFailedSession(
  sessionId: string,
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>,
  errorMessage: string,
  failedStep?: PipelineStepId | null,
) {
  if (!isActiveSessionStatus(session.status)) {
    return session;
  }

  await persistSessionFailure(
    sessionId,
    failedStep ?? null,
    errorMessage,
  );
  return (await getSession(sessionId)) ?? session;
}

function singleEventStream(event: PipelineStreamEvent): ReadableStream<Uint8Array> {
  return pipelineStreamToSSE(
    new ReadableStream<PipelineStreamEvent>({
      start(controller) {
        controller.enqueue(event);
        controller.close();
      },
    }),
  );
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getSession(id);

  if (!session) {
    return new Response("Session not found", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const startIndexParam = searchParams.get("startIndex");
  const startIndex = startIndexParam
    ? Number.parseInt(startIndexParam, 10)
    : undefined;

  if (!session.workflow_run_id) {
    return new Response(singleEventStream(terminalEventFromSession(session)), {
      headers: sseHeaders(),
    });
  }

  if (session.status === "completed" || session.status === "failed") {
    return new Response(singleEventStream(terminalEventFromSession(session)), {
      headers: sseHeaders(),
    });
  }

  try {
    const run = getRun(session.workflow_run_id);

    if (!(await run.exists)) {
      const reconciled = await reconcileFailedSession(
        id,
        session,
        "Workflow run not found or expired",
      );
      return new Response(singleEventStream(terminalEventFromSession(reconciled)), {
        headers: sseHeaders(),
      });
    }

    const workflowStatus = await run.status;
    if (workflowStatus === "failed") {
      const reconciled = await reconcileFailedSession(
        id,
        session,
        session.agent_metadata?.pipeline_progress?.error_message ??
          "Workflow failed",
        (session.agent_metadata?.pipeline_progress?.failed_step as
          | PipelineStepId
          | null
          | undefined) ?? null,
      );
      return new Response(singleEventStream(terminalEventFromSession(reconciled)), {
        headers: sseHeaders(),
      });
    }

    if (workflowStatus === "completed") {
      const refreshed = (await getSession(id)) ?? session;
      return new Response(singleEventStream(terminalEventFromSession(refreshed)), {
        headers: sseHeaders(),
      });
    }

    const readable = run.getReadable<PipelineStreamEvent>({
      namespace: PIPELINE_STREAM_NAMESPACE,
      startIndex: Number.isFinite(startIndex) ? startIndex : undefined,
    });

    return new Response(pipelineStreamToSSE(readable), {
      headers: sseHeaders(),
    });
  } catch {
    return new Response(singleEventStream(terminalEventFromSession(session)), {
      headers: sseHeaders(),
    });
  }
}

function sseHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  };
}
