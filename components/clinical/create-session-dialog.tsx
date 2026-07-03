"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RiFileUploadLine, RiLoader4Line } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

interface CreateSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
}

export function CreateSessionDialog({
  open,
  onOpenChange,
  patientId,
}: CreateSessionDialogProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFile(null);
      setError(null);
    }
  }, [open]);

  async function handleCreate() {
    if (!file) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("patient_id", patientId);
      formData.append("visit_type", "general_adult_outpatient");

      const response = await fetch("/api/sessions", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Failed to create session");
      }

      const data = (await response.json()) as { session_id: string };
      onOpenChange(false);
      router.push(`/session/${data.session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create session</DialogTitle>
          <DialogDescription>
            Upload a PDF transcript or clinical document. Text will be extracted
            and processed into a structured session note.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="pdf">PDF document</FieldLabel>
            <label
              htmlFor="pdf"
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center hover:bg-muted/50"
            >
              <RiFileUploadLine className="text-muted-foreground" />
              <span className="text-sm font-medium">
                {file ? file.name : "Click to upload PDF"}
              </span>
              <span className="text-xs text-muted-foreground">
                Text-based PDFs only (scanned images not supported yet)
              </span>
              <input
                id="pdf"
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </Field>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isSubmitting || !file}>
            {isSubmitting ? (
              <>
                <RiLoader4Line className="size-4 animate-spin" />
                Creating
              </>
            ) : (
              "Create"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
