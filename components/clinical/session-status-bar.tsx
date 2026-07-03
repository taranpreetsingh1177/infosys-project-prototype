"use client";

import { RiQuestionLine, RiRobot2Line } from "@remixicon/react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { AgentMetadata } from "@/lib/types/session";
import { cn } from "@/lib/utils";

interface SessionStatusBarProps {
  metadata: AgentMetadata;
  verified: boolean;
  onVerifiedChange?: (verified: boolean) => void;
}

export function SessionStatusBar({
  metadata,
  verified,
  onVerifiedChange,
}: SessionStatusBarProps) {
  const confidenceColor =
    metadata.confidence === "high"
      ? "bg-emerald-500"
      : metadata.confidence === "medium"
        ? "bg-amber-500"
        : "bg-destructive";

  return (
    <footer className="flex h-10 shrink-0 items-center gap-4 border-t bg-muted/30 px-4 text-sm">
      <div className="flex items-center gap-2">
        <RiRobot2Line className="text-muted-foreground" />
        <span className="text-muted-foreground">Agent confidence:</span>
        <span className="font-medium capitalize">{metadata.confidence}</span>
        <span
          className={cn("size-2 rounded-full", confidenceColor)}
          aria-hidden
        />
      </div>
      <Separator orientation="vertical" className="h-4" />
      <span className="text-muted-foreground">
        Last generated:{" "}
        <span className="text-foreground">{metadata.last_generated}</span>
      </span>
      <Separator orientation="vertical" className="h-4" />
      <span className="text-muted-foreground">
        Clinician edits:{" "}
        <span className="text-foreground">{metadata.clinician_edits}</span>
      </span>
      <div className="ml-auto flex items-center gap-2">
        <Badge variant={verified ? "default" : "secondary"} className="gap-1.5">
          <span
            className={cn(
              "size-1.5 rounded-full",
              verified ? "bg-emerald-400" : "bg-muted-foreground",
            )}
          />
          Verified
        </Badge>
        <Switch
          checked={verified}
          onCheckedChange={onVerifiedChange}
          aria-label="Toggle verified status"
        />
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Help"
        >
          <RiQuestionLine />
        </button>
      </div>
    </footer>
  );
}
