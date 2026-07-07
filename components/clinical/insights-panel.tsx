"use client";

import { useState } from "react";
import {
  RiArrowDownSLine,
  RiErrorWarningLine,
  RiHistoryLine,
  RiLineChartLine,
  RiSparkling2Line,
  RiStethoscopeLine,
} from "@remixicon/react";
import type { RemixiconComponentType } from "@remixicon/react";

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

/**
 * Insight color coding is intentionally two-toned, not decorative:
 * - Amber marks a potential documentation gap or risk the clinician should
 *   double-check (a missed detail, an unaddressed red-flag symptom, or an
 *   incomplete assessment).
 * - Sky marks a longitudinal pattern: a trend observed across prior visits.
 *   It isn't a gap in this note, so it gets a distinct, calmer color.
 */
const insightIcon: Record<InsightType, RemixiconComponentType> = {
  omission_risk: RiErrorWarningLine,
  diagnostic_consideration: RiStethoscopeLine,
  longitudinal_pattern: RiLineChartLine,
};

const insightIconClass: Record<InsightType, string> = {
  omission_risk: "text-amber-600 dark:text-amber-400",
  diagnostic_consideration: "text-amber-600 dark:text-amber-400",
  longitudinal_pattern: "text-sky-600 dark:text-sky-400",
};

export function InsightsPanel({
  insights,
  patientMemory,
}: InsightsPanelProps) {
  const [memoryDialogInsightId, setMemoryDialogInsightId] = useState<
    string | null
  >(null);
  const [expanded, setExpanded] = useState(true);

  const memoryDialogInsight = insights.find(
    (insight) => insight.id === memoryDialogInsightId,
  );

  if (insights.length === 0) return null;

  return (
    <>
      <section className="w-full rounded-xl border bg-muted/30 p-5">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className={cn(
            "flex w-full items-center justify-between gap-2 text-left",
            expanded && "mb-4",
          )}
        >
          <span className="flex items-center gap-2">
            <RiSparkling2Line className="size-4 text-muted-foreground" />
            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Insights
            </h2>
          </span>
          <RiArrowDownSLine
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              !expanded && "-rotate-90",
            )}
            aria-hidden="true"
          />
        </button>
        {expanded ? (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {insights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onPatientMemoryClick={() => setMemoryDialogInsightId(insight.id)}
              />
            ))}
          </div>
        ) : null}
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

  const Icon = insightIcon[insight.type];

  return (
    <Alert className="items-start gap-x-2.5 bg-card py-3.5">
      <Icon
        aria-hidden
        className={cn("mt-0.5", insightIconClass[insight.type])}
      />
      <AlertTitle className="text-sm">{insight.title}</AlertTitle>
      <AlertDescription>{insight.description}</AlertDescription>
      <div className="col-start-2 mt-2.5 flex flex-wrap items-center gap-1.5">
        {showPatientMemoryBadge ? (
          <Badge
            variant="outline"
            render={<button type="button" />}
            className={cn(
              "gap-1 border-transparent bg-violet-500/10 text-violet-700 dark:text-violet-300",
              "cursor-pointer transition-colors hover:bg-violet-500/15",
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
                "bg-primary/10 text-primary ring-1 ring-primary/30",
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
    </Alert>
  );
}
