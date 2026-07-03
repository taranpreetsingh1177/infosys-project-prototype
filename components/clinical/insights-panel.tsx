"use client";

import { RiSparkling2Line } from "@remixicon/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useCitationLink } from "@/hooks/use-citation-link";
import type { Insight, InsightType } from "@/lib/types/session";
import { cn } from "@/lib/utils";

interface InsightsPanelProps {
  insights: Insight[];
}

const insightBorderClass: Record<InsightType, string> = {
  omission_risk: "border-l-orange-500",
  longitudinal_pattern: "border-l-blue-500",
  diagnostic_consideration: "border-l-orange-500",
};

export function InsightsPanel({ insights }: InsightsPanelProps) {
  if (insights.length === 0) return null;

  return (
    <section className="w-full rounded-xl border bg-muted/30 p-6">
      <div className="mb-3 flex items-center gap-2">
        <RiSparkling2Line className="text-muted-foreground" />
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Insights
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>
    </section>
  );
}

function formatSourceCount(count: number): string {
  return `${count} source${count === 1 ? "" : "s"}`;
}

function InsightCard({ insight }: { insight: Insight }) {
  const { openTranscriptForInsight, isInsightActive } = useCitationLink();
  const hasSources = insight.source_line_ids.length > 0;
  const sourceLabel = formatSourceCount(insight.source_count);

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
      <AlertTitle className="flex items-center justify-between gap-2">
        {insight.title}
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
      </AlertTitle>
      <AlertDescription>{insight.description}</AlertDescription>
    </Alert>
  );
}
