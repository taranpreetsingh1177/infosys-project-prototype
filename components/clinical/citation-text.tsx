"use client";

import { RiErrorWarningLine, RiMore2Line } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCitationLink } from "@/hooks/use-citation-link";
import { FINDING_CATEGORY_CONFIG } from "@/lib/finding-category";
import type { Finding } from "@/lib/types/session";
import { cn } from "@/lib/utils";

interface CitationTextProps {
  finding: Finding;
  /** When set, render only the value portion (label shown separately). */
  valueOnly?: boolean;
  /** Chip context: subtler active/hover styles on colored backgrounds */
  inChip?: boolean;
}

function formatLineLabels(lineIds: string[]): string {
  const labels = lineIds.map(formatSourceLineId);
  return labels.length > 1 ? `Lines ${labels.join(", ")}` : `Line ${labels[0]}`;
}

function formatSourceLineId(id: string): string {
  return id.split(":").pop() ?? id;
}

export function CitationText({
  finding,
  valueOnly = false,
  inChip = false,
}: CitationTextProps) {
  const {
    setActiveFromFinding,
    clearActive,
    openTranscriptForFinding,
    isFindingActive,
  } = useCitationLink();

  const hasSources = finding.source_line_ids.length > 0;
  const isLowConfidence =
    finding.confidence === "low" || !finding.verified;
  const displayText = valueOnly && finding.value ? finding.value : finding.text;
  const highlightText = finding.highlight_text ?? finding.value;
  const isHighlighted =
    Boolean(highlightText && displayText.includes(highlightText)) || hasSources;

  const handleCitationActivate = () => {
    if (!hasSources) return;
    openTranscriptForFinding(finding.id, finding.source_line_ids);
  };

  const renderHighlightedText = () => {
    if (
      !highlightText ||
      !displayText.includes(highlightText)
    ) {
      return renderCitationSpan(displayText, isHighlighted);
    }

    const [before, after] = displayText.split(highlightText);
    return (
      <>
        {before}
        {renderCitationSpan(highlightText, true)}
        {after}
      </>
    );
  };

  const renderCitationSpan = (text: string, highlighted: boolean) => {
    const content = (
      <span
        className={cn(
          "rounded-sm transition-colors",
          highlighted &&
            hasSources &&
            finding.verified &&
            (inChip
              ? "underline decoration-current/50 decoration-dotted underline-offset-2 hover:decoration-current"
              : "decoration-muted-foreground/40 underline decoration-dotted underline-offset-4 hover:decoration-primary/60"),
          highlighted &&
            hasSources &&
            !finding.verified &&
            (inChip
              ? "underline decoration-current/60 decoration-dashed underline-offset-2"
              : "decoration-citation-uncertain/70 underline decoration-dashed underline-offset-4"),
          hasSources && "cursor-pointer",
          isFindingActive(finding.id) &&
            (inChip
              ? "rounded ring-1 ring-current/40"
              : "bg-primary/10 ring-1 ring-primary/30"),
        )}
        onMouseEnter={() => {
          if (hasSources) {
            setActiveFromFinding(finding.id, finding.source_line_ids);
          }
        }}
        onMouseLeave={() => {
          if (!isFindingActive(finding.id)) {
            clearActive();
          }
        }}
        onClick={(event) => {
          if (!hasSources) return;
          event.stopPropagation();
          handleCitationActivate();
        }}
        onKeyDown={(event) => {
          if (!hasSources) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleCitationActivate();
          }
        }}
        role={hasSources ? "button" : undefined}
        tabIndex={hasSources ? 0 : undefined}
      >
        {text}
        {isLowConfidence && (
          <RiErrorWarningLine
            className="ml-1 inline size-3.5 align-text-top text-citation-uncertain"
            aria-label="Low confidence"
          />
        )}
      </span>
    );

    if (!hasSources) {
      return content;
    }

    return (
      <Popover>
        <PopoverTrigger
          openOnHover
          delay={200}
          nativeButton={false}
          render={
            <span
              className="inline cursor-pointer"
              onClick={(event) => {
                event.preventDefault();
                handleCitationActivate();
              }}
            />
          }
        >
          {content}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64">
          <PopoverHeader>
            <PopoverTitle className="text-xs font-normal text-muted-foreground">
              Source: {formatLineLabels(finding.source_line_ids)} — transcript
            </PopoverTitle>
            <PopoverDescription>
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={handleCitationActivate}
              >
                View in transcript
              </button>
            </PopoverDescription>
          </PopoverHeader>
        </PopoverContent>
      </Popover>
    );
  };

  return <>{renderHighlightedText()}</>;
}

interface FindingListItemProps {
  finding: Finding;
}

export function FindingListItem({ finding }: FindingListItemProps) {
  const config = FINDING_CATEGORY_CONFIG[finding.category];
  const Icon = config.icon;
  const categoryLabel = finding.label ?? config.label;
  const hasValue = Boolean(finding.value);
  const isDenied =
    finding.polarity === "denied" || finding.polarity === "absent";

  return (
    <li className="flex w-full items-start gap-2.5">
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold leading-none ring-1 ring-inset",
          config.chip,
        )}
      >
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        {categoryLabel}
      </span>
      <div
        className={cn(
          "min-w-0 flex-1 pt-0.5 text-sm leading-relaxed text-foreground",
          isDenied && "italic text-muted-foreground",
        )}
      >
        {hasValue ? (
          <CitationText finding={finding} valueOnly />
        ) : (
          <CitationText finding={finding} />
        )}
      </div>
    </li>
  );
}

export function SectionMenu() {
  return (
    <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" className="shrink-0">
              <RiMore2Line />
              <span className="sr-only">Section options</span>
            </Button>
          }
        />
      <DropdownMenuContent align="end">
        <DropdownMenuItem>Edit section</DropdownMenuItem>
        <DropdownMenuItem>Regenerate</DropdownMenuItem>
        <DropdownMenuItem>Copy</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
