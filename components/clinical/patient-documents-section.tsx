"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  RiDeleteBinLine,
  RiDownloadLine,
  RiFileTextLine,
  RiUpload2Line,
} from "@remixicon/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { PatientDocument, PatientDocumentType } from "@/lib/schema";

const DOC_TYPES: { value: PatientDocumentType; label: string }[] = [
  { value: "lab", label: "Lab" },
  { value: "imaging", label: "Imaging" },
  { value: "referral", label: "Referral" },
  { value: "discharge", label: "Discharge" },
  { value: "other", label: "Other" },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadedAt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function docTypeLabel(docType: string) {
  return DOC_TYPES.find((t) => t.value === docType)?.label ?? docType;
}

export function PatientDocumentsSection({ patientId }: { patientId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState<PatientDocumentType>("lab");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const resetUploadForm = useCallback(() => {
    setTitle("");
    setDocType("lab");
    setSelectedFile(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  function handleUploadOpenChange(open: boolean) {
    setUploadOpen(open);
    if (!open) resetUploadForm();
  }

  const loadDocuments = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/documents`);
      const data = (await res.json()) as {
        documents?: PatientDocument[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load documents");
      }
      setDocuments(data.documents ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  async function handleUpload() {
    if (!selectedFile) {
      setUploadError("Choose a PDF or image file to upload.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.set("file", selectedFile);
      formData.set("doc_type", docType);
      if (title.trim()) formData.set("title", title.trim());

      const res = await fetch(`/api/patients/${patientId}/documents`, {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as {
        document?: PatientDocument;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Upload failed");
      }

      if (data.document) {
        setDocuments((prev) => [data.document!, ...prev]);
      } else {
        await loadDocuments();
      }

      handleUploadOpenChange(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(documentId: string) {
    setDeletingId(documentId);
    setError(null);
    try {
      const res = await fetch(
        `/api/patients/${patientId}/documents/${documentId}`,
        { method: "DELETE" },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Delete failed");
      }
      setDocuments((prev) => prev.filter((d) => d.document_id !== documentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {loading
            ? "Loading…"
            : documents.length === 0
              ? "No documents"
              : `${documents.length} document${documents.length === 1 ? "" : "s"}`}
        </p>
        <Button type="button" onClick={() => setUploadOpen(true)}>
          <RiUpload2Line data-icon="inline-start" />
          Add document
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
            <RiFileTextLine className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No documents yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload labs, imaging reports, referrals, or discharge summaries.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {documents.map((doc) => (
            <Card
              key={doc.document_id}
              className="w-full overflow-hidden border bg-card shadow-sm"
            >
              <div className="flex items-start justify-between gap-4 p-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <RiFileTextLine className="size-5" />
                  </div>
                  <div className="min-w-0 flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">
                        {doc.title}
                      </p>
                      <Badge variant="secondary" className="border-0">
                        {docTypeLabel(doc.doc_type)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatUploadedAt(doc.uploaded_at)} ·{" "}
                      {formatBytes(doc.byte_size)} · {doc.mime_type}
                    </p>
                    {doc.summary ? (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {doc.summary}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    render={
                      <a
                        href={`/api/patients/${patientId}/documents/${doc.document_id}`}
                        download
                      />
                    }
                    aria-label={`Download ${doc.title}`}
                  >
                    <RiDownloadLine />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => void handleDelete(doc.document_id)}
                    disabled={deletingId === doc.document_id}
                    aria-label={`Delete ${doc.title}`}
                  >
                    <RiDeleteBinLine className="text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={uploadOpen} onOpenChange={handleUploadOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload clinical document</DialogTitle>
            <DialogDescription>
              PDFs and images stay on this patient chart and feed later sessions.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="doc-title">Title</FieldLabel>
              <Input
                id="doc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. CMP panel — Mar 2026"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="doc-type">Type</FieldLabel>
              <Select
                items={DOC_TYPES}
                value={docType}
                onValueChange={(value) => {
                  if (value != null) {
                    setDocType(value as PatientDocumentType);
                  }
                }}
              >
                <SelectTrigger id="doc-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {DOC_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="doc-file">File</FieldLabel>
              <Input
                id="doc-file"
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
              {selectedFile ? (
                <p className="text-xs text-muted-foreground">
                  {selectedFile.name} · {formatBytes(selectedFile.size)}
                </p>
              ) : null}
            </Field>
            {uploadError ? (
              <p className="text-sm text-destructive">{uploadError}</p>
            ) : null}
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleUploadOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleUpload()}
              disabled={uploading || !selectedFile}
            >
              <RiUpload2Line data-icon="inline-start" />
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
