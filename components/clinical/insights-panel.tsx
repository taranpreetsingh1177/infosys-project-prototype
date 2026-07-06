"use client";

import { useState } from "react";
import { RiHistoryLine, RiSparkling2Line } from "@remixicon/react";

import { PatientMemoryDialog } from "@/components/clinical/patient-memory-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useCitationLink } from "@/hooks/use-citation-link";
import type {
  Insight,
  InsightType,
  PatientMemorySnapshot,
} from "@/lib/types/session";
import { cn } from "@/lib/utils";

interface InsightsPanelProps {
  insights: Insight[];
  patientMemory?: PatientMemorySnapshot | null;
}

const insightBorderClass: Record<InsightType, string> = {
  omission_risk: "border-l-orange-500",
  longitudinal_pattern: "border-l-blue-500",
  diagnostic_consideration: "border-l-orange-500",
};

export function InsightsPanel({
  insights,
  patientMemory,
}: InsightsPanelProps) {
  const [memoryDialogInsightId, setMemoryDialogInsightId] = useState<
    string | null
  >(null);

  const memoryDialogInsight = insights.find(
    (insight) => insight.id === memoryDialogInsightId,
  );

  if (insights.length === 0) return null;

  return (
    <>
      <section className="w-full rounded-xl border bg-muted/30 p-6">
        <div className="mb-3 flex items-center gap-2">
          <RiSparkling2Line className="text-muted-foreground" />
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Insights
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {insights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onPatientMemoryClick={() => setMemoryDialogInsightId(insight.id)}
            />
          ))}
        </div>
      </section>

      {memoryDialogInsight?.memory_reason ? (
        <PatientMemoryDialog
          open={memoryDialogInsightId !== null}
          onOpenChange={(open) => {
            if (!open) setMemoryDialogInsightId(null);
          }}
          memoryReason={memoryDialogInsight.memory_reason}
          memoryFieldsUsed={memoryDialogInsight.memory_fields_used}
          patientMemory={patientMemory}
        />
      ) : null}
    </>
  );
}

function formatSourceCount(count: number): string {
  return `${count} source${count === 1 ? "" : "s"}`;
}

interface InsightCardProps {
  insight: Insight;
  onPatientMemoryClick: () => void;
}

function InsightCard({ insight, onPatientMemoryClick }: InsightCardProps) {
  const { openTranscriptForInsight, isInsightActive } = useCitationLink();
  const hasSources = insight.source_line_ids.length > 0;
  const sourceLabel = formatSourceCount(insight.source_count);
  const isLongitudinal = insight.type === "longitudinal_pattern";
  const showPatientMemoryBadge =
    insight.memory_context_used &&
    Boolean(insight.memory_reason?.trim()) &&
    !isLongitudinal;

  const handleSourcesActivate = () => {
    if (!hasSources) return;
    openTranscriptForInsight(insight.id, insight.source_line_ids);
  };

  return (
    <Alert
      className={cn(
        "border-l-4 bg-card",
        insightBorderClass[insight.type],
      )}
    >
      <AlertTitle className="flex items-start justify-between gap-2">
        <span className="min-w-0">{insight.title}</span>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {isLongitudinal ? (
            <Badge
              variant="outline"
              className="border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300"
            >
              Longitudinal
            </Badge>
          ) : null}
          {showPatientMemoryBadge ? (
            <Badge
              variant="outline"
              render={<button type="button" />}
              className={cn(
                "gap-0.5 border-violet-500/30 bg-violet-500/5 text-violet-700 dark:text-violet-300",
                "cursor-pointer transition-colors hover:bg-violet-500/10",
              )}
              onClick={onPatientMemoryClick}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onPatientMemoryClick();
                }
              }}
              aria-label="View why patient memory was used for this insight"
            >
              <RiHistoryLine aria-hidden />
              Patient memory
            </Badge>
          ) : null}
          {hasSources ? (
            <Badge
              variant="secondary"
              render={<button type="button" />}
              className={cn(
                "cursor-pointer transition-colors hover:bg-secondary/70",
                isInsightActive(insight.id) &&
                  "bg-primary/10 ring-1 ring-primary/30",
              )}
              onClick={handleSourcesActivate}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleSourcesActivate();
                }
              }}
              aria-label={`View ${sourceLabel} in transcript`}
            >
              {sourceLabel}
            </Badge>
          ) : (
            <Badge variant="secondary">{sourceLabel}</Badge>
          )}
        </div>
      </AlertTitle>
      <AlertDescription>{insight.description}</AlertDescription>
    </Alert>
  );
}
