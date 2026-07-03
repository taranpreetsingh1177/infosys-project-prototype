"use client";

import { useEffect, useRef } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useCitationLink } from "@/hooks/use-citation-link";
import type { SourceLine } from "@/lib/types/session";
import { cn } from "@/lib/utils";

interface TranscriptPanelProps {
  lines: SourceLine[];
  className?: string;
}

export function TranscriptPanel({ lines, className }: TranscriptPanelProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <ScrollArea className="min-h-0 flex-1 px-4 py-4">
        <div className="flex flex-col gap-3">
          {lines.map((line) => (
            <TranscriptLine key={line.line_id} line={line} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function TranscriptLine({ line }: { line: SourceLine }) {
  const ref = useRef<HTMLDivElement>(null);
  const { registerLineRef, setActiveFromLine, isLineActive } =
    useCitationLink();

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
        "flex cursor-pointer gap-3 rounded-md px-2 py-1.5 text-sm transition-colors",
        active && "bg-citation ring-2 ring-primary/20"
      )}
      onClick={() => setActiveFromLine(line.line_id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setActiveFromLine(line.line_id);
        }
      }}
    >
      <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground">
        {line.line_id.split(":").pop() ?? line.line_id}
      </span>
      <p>
        <span className="font-medium capitalize">{line.speaker}: </span>
        {line.text}
      </p>
    </div>
  );
}
