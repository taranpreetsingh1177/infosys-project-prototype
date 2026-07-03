"use client";

import { RiFileTextLine } from "@remixicon/react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { useCitationLink } from "@/hooks/use-citation-link";

interface SessionHeaderProps {
  patientId: string;
  patientName: string;
  visitDate: string;
}

function formatVisitDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function SessionHeader({
  patientId,
  patientName,
  visitDate,
}: SessionHeaderProps) {
  const formattedDate = formatVisitDate(visitDate);
  const { setTranscriptOpen } = useCitationLink();

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
