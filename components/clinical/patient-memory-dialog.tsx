"use client";

import { useState } from "react";
import { RiHistoryLine } from "@remixicon/react";

import {
  PatientMemoryFullDialog,
  formatMemoryFieldLabel,
} from "@/components/clinical/patient-memory-full-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PatientMemorySnapshot } from "@/lib/types/session";

interface PatientMemoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memoryReason: string;
  memoryFieldsUsed?: string[];
  patientMemory?: PatientMemorySnapshot | null;
}

export function PatientMemoryDialog({
  open,
  onOpenChange,
  memoryReason,
  memoryFieldsUsed = [],
  patientMemory,
}: PatientMemoryDialogProps) {
  const [fullMemoryOpen, setFullMemoryOpen] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFullMemoryOpen(false);
    }
    onOpenChange(nextOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RiHistoryLine
                className="text-violet-600 dark:text-violet-400"
                aria-hidden
              />
              Why patient memory was used
            </DialogTitle>
            <DialogDescription>
              Clinical reasoning for how prior visit context informed this
              insight.
            </DialogDescription>
          </DialogHeader>

          <p className="text-sm leading-relaxed text-foreground">
            {memoryReason}
          </p>

          {memoryFieldsUsed.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {memoryFieldsUsed.map((field) => (
                <Badge
                  key={field}
                  variant="outline"
                  className="border-violet-500/30 bg-violet-500/5 text-violet-700 dark:text-violet-300"
                >
                  {formatMemoryFieldLabel(field)}
                </Badge>
              ))}
            </div>
          ) : null}

          {patientMemory ? (
            <Button
              type="button"
              variant="outline"
              className="w-full border-violet-500/30 text-violet-700 hover:bg-violet-500/10 dark:text-violet-300"
              onClick={() => setFullMemoryOpen(true)}
            >
              <RiHistoryLine aria-hidden />
              View full patient memory
            </Button>
          ) : null}
        </DialogContent>
      </Dialog>

      {patientMemory ? (
        <PatientMemoryFullDialog
          open={fullMemoryOpen}
          onOpenChange={setFullMemoryOpen}
          patientMemory={patientMemory}
          highlightFields={memoryFieldsUsed}
        />
      ) : null}
    </>
  );
}
