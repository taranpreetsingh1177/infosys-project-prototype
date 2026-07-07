"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TranscriptPanel } from "@/components/clinical/transcript-panel";
import { useCitationLink } from "@/hooks/use-citation-link";
import type { SourceLine } from "@/lib/types/session";

interface TranscriptSheetProps {
  lines: SourceLine[];
}

export function TranscriptSheet({ lines }: TranscriptSheetProps) {
  const { transcriptOpen, setTranscriptOpen } = useCitationLink();

  return (
    <Sheet open={transcriptOpen} onOpenChange={setTranscriptOpen}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 bg-background p-0 sm:max-w-md">
        <SheetHeader className="gap-1 border-b px-5 py-4">
          <SheetTitle>Original Transcript</SheetTitle>
          <SheetDescription>
            Tap a citation in the SOAP note to jump to the source line.
          </SheetDescription>
        </SheetHeader>
        <TranscriptPanel lines={lines} className="min-h-0 flex-1" />
      </SheetContent>
    </Sheet>
  );
}
