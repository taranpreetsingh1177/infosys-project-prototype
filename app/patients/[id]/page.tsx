"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  RiArrowLeftLine,
  RiArrowRightSLine,
  RiFileList3Line,
  RiSearchLine,
} from "@remixicon/react";

import {
  ClinicalShell,
  CreateSessionButton,
  CreateSessionProvider,
  useCreateSession,
} from "@/components/clinical/clinical-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getPatientAvatarClassName,
  getPatientInitials,
} from "@/lib/patient-avatar";
import type { Patient, Session } from "@/lib/schema";
import type { PatientStatus } from "@/lib/types/session";
import { cn } from "@/lib/utils";

function formatAge(dateOfBirth: string | null | undefined) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

function formatGender(gender: Patient["gender"]) {
  if (!gender || gender === "unknown") return null;
  return gender.charAt(0).toUpperCase() + gender.slice(1);
}

function patientStatusBadge(status: PatientStatus | undefined) {
  switch (status) {
    case "inactive":
      return { label: "Inactive", className: "bg-muted text-muted-foreground" };
    case "new":
      return { label: "New", className: "bg-blue-100 text-blue-800" };
    case "archived":
      return { label: "Archived", className: "bg-muted text-muted-foreground" };
    default:
      return { label: "Active", className: "bg-emerald-100 text-emerald-800" };
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatVisitType(visitType: string) {
  return visitType.replaceAll("_", " ");
}

function statusLabel(status: Session["status"]) {
  switch (status) {
    case "completed":
      return "Complete";
    case "processing":
      return "Processing";
    case "failed":
      return "Failed";
    default:
      return "Pending";
  }
}

function statusBadgeClass(status: Session["status"]) {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-800";
    case "processing":
      return "bg-blue-100 text-blue-800";
    case "failed":
      return "bg-red-100 text-red-800";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function matchesSearch(session: Session, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const fields = [
    formatDate(session.created_at),
    formatVisitType(session.visit_type),
    statusLabel(session.status),
  ];

  return fields.some((field) => field.toLowerCase().includes(q));
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function PatientDetailsCard({ patient }: { patient: Patient }) {
  const age = formatAge(patient.date_of_birth);
  const gender = formatGender(patient.gender);
  const statusBadge = patientStatusBadge(patient.status);
  const dobDisplay = patient.date_of_birth
    ? `${formatDate(patient.date_of_birth)}${age != null ? ` (${age}y)` : ""}`
    : null;

  return (
    <Card className="w-full overflow-hidden border bg-card shadow-sm">
      <div className="flex flex-col gap-6 p-4 md:flex-row md:items-start md:gap-8">
        <div className="flex items-center gap-4 md:min-w-[220px]">
          <div
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-full text-base font-semibold",
              getPatientAvatarClassName(patient.patient_id),
            )}
          >
            {getPatientInitials(patient.name)}
          </div>
          <div className="space-y-1.5">
            <Badge className={cn("border-0", statusBadge.className)}>
              {statusBadge.label}
            </Badge>
            {patient.mrn && (
              <p className="text-sm text-muted-foreground">MRN {patient.mrn}</p>
            )}
          </div>
        </div>

        <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Date of birth" value={dobDisplay} />
          <DetailItem label="Gender" value={gender} />
          <DetailItem label="Phone" value={patient.phone} />
          <DetailItem label="Email" value={patient.email} />
        </div>
      </div>
    </Card>
  );
}

function PatientDetailsSkeleton() {
  return (
    <Card className="w-full overflow-hidden border bg-card shadow-sm">
      <div className="flex flex-col gap-6 p-4 md:flex-row md:items-start md:gap-8">
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function EmptySessionsCard() {
  const createCtx = useCreateSession();

  return (
    <Card className="border-dashed py-16 text-center shadow-none">
      <div className="mx-auto w-full max-w-md">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
          <RiFileList3Line className="size-7 text-muted-foreground" />
        </div>
        <CardHeader className="w-full max-w-md space-y-2 pb-2">
          <CardTitle className="text-xl">No sessions yet</CardTitle>
          <CardDescription className="max-w-none text-base">
            Upload a PDF transcript or clinical document to create the first
            session for this patient.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Button onClick={() => createCtx?.openCreate()}>Create session</Button>
        </CardContent>
      </div>
    </Card>
  );
}

function SessionCardItem({ session }: { session: Session }) {
  return (
    <Link href={`/session/${session.session_id}`} className="block">
      <Card className="w-full overflow-hidden border bg-card shadow-sm transition-colors hover:bg-muted/30">
        <div className="flex items-center justify-between gap-4 p-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <RiFileList3Line className="size-5" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="truncate text-base font-semibold">
                {formatDate(session.created_at)}
              </p>
              <p className="truncate text-sm capitalize text-muted-foreground">
                {formatVisitType(session.visit_type)}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Badge
              className={cn("border-0", statusBadgeClass(session.status))}
            >
              {statusLabel(session.status)}
            </Badge>
            <RiArrowRightSLine className="size-5 text-muted-foreground" />
          </div>
        </div>
      </Card>
    </Link>
  );
}

function SessionListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  );
}

export default function PatientHistoryPage() {
  const params = useParams<{ id: string }>();
  const patientId = params.id;
  const [patient, setPatient] = useState<Patient | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    void fetch(`/api/patients/${patientId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { patient: Patient; sessions: Session[] } | null) => {
        if (data) {
          setPatient(data.patient);
          setSessions(data.sessions);
        }
      })
      .finally(() => setLoading(false));
  }, [patientId]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => matchesSearch(session, search));
  }, [sessions, search]);

  if (loading) {
    return (
      <ClinicalShell>
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-12 w-64" />
          <PatientDetailsSkeleton />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-full" />
          <SessionListSkeleton />
        </div>
      </ClinicalShell>
    );
  }

  if (!patient) {
    return (
      <ClinicalShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-muted-foreground">Patient not found</p>
        </div>
      </ClinicalShell>
    );
  }

  return (
    <ClinicalShell>
      <CreateSessionProvider patientId={patientId}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 w-fit"
              render={<Link href="/" />}
            >
              <RiArrowLeftLine data-icon="inline-start" />
              Back to patients
            </Button>
            <div className="space-y-1">
              <h1 className="font-serif text-4xl font-normal tracking-tight">
                {patient.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                Patient profile and session history
              </p>
            </div>
          </div>
          <CreateSessionButton label="Create session" />
        </div>

        <PatientDetailsCard patient={patient} />

        <div className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Session history
          </h2>

          <div className="relative">
            <RiSearchLine className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sessions by date, visit type, or status..."
              className="h-10 pl-9"
            />
          </div>

          <p className="text-sm text-muted-foreground">
            {sessions.length === 0
              ? "No sessions"
              : `${filteredSessions.length} session${filteredSessions.length === 1 ? "" : "s"}`}
          </p>

          {sessions.length === 0 ? (
            <EmptySessionsCard />
          ) : filteredSessions.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm font-medium">No sessions found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your search terms
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredSessions.map((session) => (
                <SessionCardItem key={session.session_id} session={session} />
              ))}
            </div>
          )}
        </div>
      </div>
      </CreateSessionProvider>
    </ClinicalShell>
  );
}
