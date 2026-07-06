import type { PipelineProgress } from "@/lib/types/session";

export const PIPELINE_STREAM_NAMESPACE = "pipeline";

export type PipelineStreamStatus =
  | "pending"
  | "processing"
  | "complete"
  | "error"
  | "cancelled";

export type PipelineStreamEvent =
  | {
      type: "init";
      progress: PipelineProgress;
      status: "processing";
    }
  | {
      type: "step_started";
      stepId: string;
      progress: PipelineProgress;
      status: "processing";
    }
  | {
      type: "step_completed";
      stepId: string;
      progress: PipelineProgress;
      status: "processing";
    }
  | {
      type: "failed";
      stepId: string | null;
      errorMessage: string;
      progress: PipelineProgress;
      status: "error";
    }
  | {
      type: "cancelled";
      stepId: string | null;
      errorMessage: string;
      progress: PipelineProgress;
      status: "cancelled";
    }
  | {
      type: "done";
      progress: PipelineProgress;
      status: "complete";
    };

export function pipelineStreamToSSE(
  readable: ReadableStream<PipelineStreamEvent>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return readable.pipeThrough(
    new TransformStream<PipelineStreamEvent, Uint8Array>({
      transform(event, controller) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      },
    }),
  );
}
