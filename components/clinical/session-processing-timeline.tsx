"use client";

import Link from "next/link";
import {
  RiArrowLeftLine,
  RiCheckLine,
  RiCloseCircleLine,
  RiLoader4Line,
  RiTimeLine,
} from "@remixicon/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PIPELINE_STEP_IDS, PIPELINE_STEPS } from "@/lib/pipeline-steps";
import { normalizePipelineProgress } from "@/lib/pipeline-progress-utils";
import type { PipelineProgress, SessionStatus } from "@/lib/types/session";
import { cn } from "@/lib/utils";

type StepState = "pending" | "in-progress" | "completed" | "failed";

interface SessionProcessingTimelineProps {
  status: SessionStatus;
  progress?: PipelineProgress;
  patientId: string;
  patientName: string;
}

function getStepState(
  stepId: string,
  progress: PipelineProgress | undefined,
): StepState {
  if (!progress) return "pending";
  if (progress.failed_step === stepId) return "failed";
  if (progress.completed_steps.includes(stepId)) return "completed";

  const stepIndex = PIPELINE_STEP_IDS.indexOf(
    stepId as (typeof PIPELINE_STEP_IDS)[number],
  );
  const currentIndex = progress.current_step
    ? PIPELINE_STEP_IDS.indexOf(
        progress.current_step as (typeof PIPELINE_STEP_IDS)[number],
      )
    : -1;

  if (progress.current_step === stepId) return "in-progress";
  if (currentIndex >= 0 && stepIndex >= 0 && stepIndex < currentIndex) {
    return "completed";
  }

  return "pending";
}

function StepIcon({ state }: { state: StepState }) {
  if (state === "completed") {
    return (
      <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <RiCheckLine className="size-4" />
      </span>
    );
  }

  if (state === "in-progress") {
    return (
      <span className="flex size-8 items-center justify-center rounded-full border-2 border-primary bg-background text-primary">
        <RiLoader4Line className="size-4 animate-spin" />
      </span>
    );
  }

  if (state === "failed") {
    return (
      <span className="flex size-8 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <RiCloseCircleLine className="size-4" />
      </span>
    );
  }

  return (
    <span className="flex size-8 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
      <RiTimeLine className="size-4" />
    </span>
  );
}

function statusBadge(status: SessionStatus) {
  switch (status) {
    case "processing":
      return <Badge variant="secondary">Processing</Badge>;
    case "pending":
      return <Badge variant="outline">Queued</Badge>;
    case "error":
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return <Badge>Complete</Badge>;
  }
}

export function SessionProcessingTimeline({
  status,
  progress,
  patientId,
  patientName,
}: SessionProcessingTimelineProps) {
  const normalizedProgress = progress
    ? normalizePipelineProgress(progress)
    : undefined;
  const completedCount = normalizedProgress?.completed_steps.length ?? 0;
  const totalSteps = PIPELINE_STEPS.length;
  const isFailed = status === "error";

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-5xl">
        <Card className="w-full">
          <CardHeader>
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 mb-3 w-fit"
              render={<Link href={`/patients/${patientId}`} />}
            >
              <RiArrowLeftLine data-icon="inline-start" />
              Back to {patientName}
            </Button>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <CardTitle>Clinical scribe pipeline</CardTitle>
                <CardDescription>
                  {isFailed
                    ? `Session for ${patientName} encountered an error. Review the details below.`
                    : `Processing session for ${patientName}. Analyzing the transcript and generating your clinical documentation.`}
                </CardDescription>
              </div>
              {statusBadge(status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isFailed && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>
                    {completedCount} of {totalSteps} steps
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                    style={{
                      width: `${Math.round((completedCount / totalSteps) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {isFailed && progress?.error_message && (
              <Alert variant="destructive">
                <RiCloseCircleLine />
                <AlertTitle>Processing failed</AlertTitle>
                <AlertDescription>{progress.error_message}</AlertDescription>
              </Alert>
            )}

            <ol className="space-y-0">
              {PIPELINE_STEPS.map((step, index) => {
                const state = getStepState(step.id, normalizedProgress);
                const isLast = index === PIPELINE_STEPS.length - 1;

                return (
                  <li key={step.id} className="relative flex gap-4">
                    {!isLast && (
                      <span
                        aria-hidden
                        className={cn(
                          "absolute top-8 bottom-0 left-4 w-px -translate-x-1/2",
                          state === "completed" ? "bg-primary" : "bg-border",
                        )}
                      />
                    )}
                    <div className="relative z-10 shrink-0 rounded-full bg-background">
                      <StepIcon state={state} />
                    </div>
                    <div className={cn("min-w-0 flex-1", !isLast && "pb-6")}>
                      <p
                        className={cn(
                          "text-sm font-medium",
                          state === "pending" && "text-muted-foreground",
                          state === "in-progress" && "text-foreground",
                          state === "completed" && "text-foreground",
                          state === "failed" && "text-destructive",
                        )}
                      >
                        {step.label}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>

            {isFailed && (
              <div className="flex justify-end border-t pt-4">
                <Button render={<Link href={`/patients/${patientId}`} />}>
                  Return to patient
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
