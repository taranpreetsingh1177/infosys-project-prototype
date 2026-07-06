"use client";

import { RiHistoryLine } from "@remixicon/react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { PatientMemorySnapshot } from "@/lib/types/session";
import { cn } from "@/lib/utils";

interface PatientMemoryFullDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientMemory: PatientMemorySnapshot;
  /** Structured fields to visually emphasize (e.g. from an insight). */
  highlightFields?: string[];
}

function formatMemoryFieldLabel(field: string): string {
  return field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatVisitDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface MemorySectionProps {
  title: string;
  fieldKey: string;
  items: string[];
  highlightFields: Set<string>;
}

function MemoryListSection({
  title,
  fieldKey,
  items,
  highlightFields,
}: MemorySectionProps) {
  if (items.length === 0) return null;

  const highlighted = highlightFields.has(fieldKey);

  return (
    <section
      className={cn(
        "rounded-lg border p-3",
        highlighted && "border-violet-500/40 bg-violet-500/5",
      )}
    >
      <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
        {highlighted ? (
          <Badge
            variant="outline"
            className="border-violet-500/30 bg-violet-500/5 text-[10px] text-violet-700 normal-case dark:text-violet-300"
          >
            Used in insight
          </Badge>
        ) : null}
      </h3>
      <ul className="space-y-1 text-sm leading-relaxed">
        {items.map((item) => (
          <li key={item} className="text-foreground">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PatientMemoryFullDialog({
  open,
  onOpenChange,
  patientMemory,
  highlightFields = [],
}: PatientMemoryFullDialogProps) {
  const highlightSet = new Set(highlightFields);
  const { structured } = patientMemory;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <RiHistoryLine
              className="text-violet-600 dark:text-violet-400"
              aria-hidden
            />
            Patient memory
            <Badge variant="secondary" className="font-normal">
              v{patientMemory.version}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Longitudinal context from prior visits, as available at the time this
            session was processed.
          </DialogDescription>
        </DialogHeader>

        {patientMemory.summary.trim() ? (
          <section
            className={cn(
              "rounded-lg border p-3",
              highlightSet.has("summary") &&
                "border-violet-500/40 bg-violet-500/5",
            )}
          >
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Summary
            </h3>
            <p className="text-sm leading-relaxed text-foreground">
              {patientMemory.summary}
            </p>
          </section>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <MemoryListSection
            title="Active problems"
            fieldKey="active_problems"
            items={structured.active_problems}
            highlightFields={highlightSet}
          />
          <MemoryListSection
            title="Chronic conditions"
            fieldKey="chronic_conditions"
            items={structured.chronic_conditions}
            highlightFields={highlightSet}
          />
          <MemoryListSection
            title="Medications"
            fieldKey="medications"
            items={structured.medications}
            highlightFields={highlightSet}
          />
          <MemoryListSection
            title="Allergies"
            fieldKey="allergies"
            items={structured.allergies}
            highlightFields={highlightSet}
          />
          <MemoryListSection
            title="Social history"
            fieldKey="social_history"
            items={structured.social_history}
            highlightFields={highlightSet}
          />
        </div>

        {structured.recent_visits.length > 0 ? (
          <section
            className={cn(
              "rounded-lg border p-3",
              highlightSet.has("recent_visits") &&
                "border-violet-500/40 bg-violet-500/5",
            )}
          >
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Recent visits
              {highlightSet.has("recent_visits") ? (
                <Badge
                  variant="outline"
                  className="border-violet-500/30 bg-violet-500/5 text-[10px] text-violet-700 normal-case dark:text-violet-300"
                >
                  Used in insight
                </Badge>
              ) : null}
            </h3>
            <ul className="space-y-2">
              {structured.recent_visits.map((visit) => (
                <li
                  key={`${visit.session_id}-${visit.date}`}
                  className="rounded-md border bg-muted/30 px-3 py-2 text-sm"
                >
                  <p className="font-medium text-foreground">
                    {formatVisitDate(visit.date)}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">{visit.one_liner}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export { formatMemoryFieldLabel };
