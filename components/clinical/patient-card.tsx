"use client";

import Link from "next/link";
import { RiArrowRightSLine, RiArrowRightUpLine } from "@remixicon/react";

import { Card } from "@/components/ui/card";
import {
  getPatientAvatarClassName,
  getPatientInitials,
} from "@/lib/patient-avatar";
import type { PatientCard } from "@/lib/types/session";
import { cn } from "@/lib/utils";

interface PatientCardItemProps {
  patient: PatientCard;
}

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

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatRelativeUpdated(date: string) {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(date);
}

function formatVisitType(visitType: string) {
  return visitType.replaceAll("_", " ");
}

function formatGender(gender: PatientCard["gender"]) {
  if (!gender || gender === "unknown") return null;
  return gender.charAt(0).toUpperCase() + gender.slice(1);
}

export function PatientCardItem({ patient }: PatientCardItemProps) {
  const age = formatAge(patient.date_of_birth);
  const gender = formatGender(patient.gender);
  const lastUpdated = patient.updated_at ?? patient.last_session_at;
  const recentSessions = (patient.recent_sessions ?? []).slice(0, 3);

  const mrnAgeGender = [
    patient.mrn ? `MRN ${patient.mrn}` : null,
    age != null ? `${age}y` : null,
    gender,
  ]
    .filter(Boolean)
    .join(" · ");

  const contactLine = [patient.phone, patient.email].filter(Boolean).join(" · ");

  return (
    <Card className="w-full overflow-hidden border bg-card shadow-sm transition-colors hover:bg-muted/30">
      <div className="grid grid-cols-1 items-start gap-4 p-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_auto] md:gap-6">
        <div className="flex gap-4">
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
              getPatientAvatarClassName(patient.patient_id),
            )}
          >
            {getPatientInitials(patient.name)}
          </div>

          <div className="min-w-0 space-y-0.5">
            <Link
              href={`/patients/${patient.patient_id}`}
              className="inline-flex max-w-full cursor-pointer items-center gap-1 text-base font-semibold underline"
            >
              <span className="truncate">{patient.name}</span>
              <RiArrowRightUpLine className="size-4 shrink-0" />
            </Link>
            {mrnAgeGender && (
              <p className="truncate text-sm text-muted-foreground">
                {mrnAgeGender}
              </p>
            )}
            {contactLine && (
              <p className="truncate text-sm text-muted-foreground">
                {contactLine}
              </p>
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-2 md:px-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Recent sessions
          </p>
          {recentSessions.length > 0 ? (
            <ul className="space-y-1">
              {recentSessions.map((session) => (
                <li key={session.session_id}>
                  <Link
                    href={`/session/${session.session_id}`}
                    className="block truncate text-sm capitalize text-foreground hover:underline"
                  >
                    {formatDate(session.created_at)} —{" "}
                    {formatVisitType(session.visit_type)}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No sessions yet</p>
          )}
          <Link
            href={`/patients/${patient.patient_id}`}
            className={cn(
              "inline-flex items-center gap-0.5 text-sm font-medium text-primary hover:underline",
              patient.session_count === 0 && "pointer-events-none opacity-50",
            )}
          >
            View all sessions
            <RiArrowRightSLine className="size-4" />
          </Link>
        </div>

        <div className="flex flex-col items-start gap-1.5 md:items-end">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Last updated {formatRelativeUpdated(lastUpdated)}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
