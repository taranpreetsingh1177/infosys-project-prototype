"use client";

import { useState } from "react";
import { RiDownloadLine, RiFileTextLine } from "@remixicon/react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCitationLink } from "@/hooks/use-citation-link";
import type { SessionStatus } from "@/lib/types/session";

interface SessionHeaderProps {
  sessionId: string;
  patientId: string;
  patientName: string;
  visitDate: string;
  status: SessionStatus;
}

function formatVisitDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

async function downloadExport(sessionId: string, format: "pdf" | "json") {
  const response = await fetch(
    `/api/sessions/${encodeURIComponent(sessionId)}/export?format=${format}`,
  );

  if (!response.ok) {
    let message = `Export failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="([^"]+)"/);
  const filename =
    match?.[1] ??
    (format === "pdf"
      ? `visit-summary-${sessionId}.pdf`
      : `session-${sessionId}.json`);

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function SessionHeader({
  sessionId,
  patientId,
  patientName,
  visitDate,
  status,
}: SessionHeaderProps) {
  const formattedDate = formatVisitDate(visitDate);
  const { setTranscriptOpen } = useCitationLink();
  const [exporting, setExporting] = useState<"pdf" | "json" | null>(null);
  const canExport = status === "complete";

  const handleExport = async (format: "pdf" | "json") => {
    if (exporting) return;
    setExporting(format);
    try {
      await downloadExport(sessionId, format);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Export failed";
      window.alert(message);
    } finally {
      setExporting(null);
    }
  };

  return (
    <header className="flex h-12 shrink-0 items-center border-b px-6">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-2">
        <Breadcrumb className="min-w-0 flex-1">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Patients</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/patients/${patientId}`}>
                {patientName}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="truncate">
                Session — {formattedDate}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        {canExport ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  disabled={exporting !== null}
                />
              }
            >
              <RiDownloadLine data-icon="inline-start" />
              {exporting ? "Exporting…" : "Export"}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={exporting !== null}
                onClick={() => void handleExport("pdf")}
              >
                Share with patient (PDF)
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={exporting !== null}
                onClick={() => void handleExport("json")}
              >
                Download JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTranscriptOpen(true)}
        >
          <RiFileTextLine data-icon="inline-start" />
          Transcript
        </Button>
      </div>
    </header>
  );
}
