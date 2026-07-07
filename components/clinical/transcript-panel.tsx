"use client";

import { useEffect, useRef } from "react";
import { RiChatHistoryLine, RiStethoscopeLine, RiUserLine } from "@remixicon/react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useCitationLink } from "@/hooks/use-citation-link";
import { lineIdSuffix } from "@/lib/line-id";
import type { SourceLine } from "@/lib/types/session";
import { cn } from "@/lib/utils";

interface TranscriptPanelProps {
  lines: SourceLine[];
  className?: string;
}

const SPEAKER_CONFIG: Record<
  SourceLine["speaker"],
  { label: string; icon: typeof RiUserLine }
> = {
  doctor: {
    label: "Doctor",
    icon: RiStethoscopeLine,
  },
  patient: {
    label: "Patient",
    icon: RiUserLine,
  },
};

export function TranscriptPanel({ lines, className }: TranscriptPanelProps) {
  if (lines.length === 0) {
    return (
      <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground">
          <RiChatHistoryLine className="size-6" aria-hidden="true" />
          <p className="text-sm">No transcript available for this session.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col px-3 py-3">
          {lines.map((line, index) => (
            <TranscriptLine
              key={line.line_id}
              line={line}
              isNewSpeaker={index === 0 || lines[index - 1].speaker !== line.speaker}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function TranscriptLine({
  line,
  isNewSpeaker,
}: {
  line: SourceLine;
  isNewSpeaker: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { registerLineRef, setActiveFromLine, isLineActive } =
    useCitationLink();
  const config = SPEAKER_CONFIG[line.speaker];
  const Icon = config.icon;

  useEffect(() => {
    registerLineRef(line.line_id, ref.current);
    return () => registerLineRef(line.line_id, null);
  }, [line.line_id, registerLineRef]);

  const active = isLineActive(line.line_id);

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      className={cn(
        "flex cursor-pointer scroll-mt-4 flex-col gap-1 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        isNewSpeaker ? "mt-3 first:mt-0" : "mt-0.5",
        active && "bg-citation hover:bg-citation",
      )}
      onClick={() => setActiveFromLine(line.line_id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setActiveFromLine(line.line_id);
        }
      }}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "select-none rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-foreground",
            active && "bg-citation-foreground/10 text-citation-foreground",
          )}
        >
          {lineIdSuffix(line.line_id)}
        </span>
        <span
          className={cn(
            "flex items-center gap-1 text-xs font-medium text-muted-foreground",
            active && "text-citation-foreground/70",
          )}
        >
          <Icon className="size-3" aria-hidden="true" />
          {config.label}
        </span>
      </div>
      <p
        className={cn(
          "text-sm leading-relaxed text-foreground/90",
          active && "text-citation-foreground",
        )}
      >
        {line.text}
      </p>
    </div>
  );
}
