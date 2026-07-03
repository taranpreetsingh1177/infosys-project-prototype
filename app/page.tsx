"use client";

import { useEffect, useMemo, useState } from "react";
import { RiSearchLine } from "@remixicon/react";

import {
  ClinicalShell,
  PatientListSkeleton,
} from "@/components/clinical/clinical-shell";
import { PatientCardItem } from "@/components/clinical/patient-card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MOCK_PATIENTS } from "@/lib/mock/rajesh-sharma-session";
import type { PatientCard } from "@/lib/types/session";

type SortOption = "last_updated" | "name_asc" | "name_desc";

function matchesSearch(patient: PatientCard, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const fields = [
    patient.name,
    patient.mrn,
    patient.phone,
    patient.email,
    patient.date_of_birth,
  ];

  return fields.some((field) => field?.toLowerCase().includes(q));
}

function sortPatients(patients: PatientCard[], sort: SortOption) {
  const sorted = [...patients];
  switch (sort) {
    case "name_asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "name_desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case "last_updated":
    default:
      return sorted.sort((a, b) => {
        const aDate = a.updated_at ?? a.last_session_at ?? "";
        const bDate = b.updated_at ?? b.last_session_at ?? "";
        return bDate.localeCompare(aDate);
      });
  }
}

export default function HomePage() {
  const [patients, setPatients] = useState<PatientCard[] | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("last_updated");

  useEffect(() => {
    void fetch("/api/patients")
      .then((res) => (res.ok ? res.json() : { patients: MOCK_PATIENTS }))
      .then((data: { patients: PatientCard[] }) => setPatients(data.patients))
      .catch(() => setPatients(MOCK_PATIENTS));
  }, []);

  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    const filtered = patients.filter((patient) => matchesSearch(patient, search));
    return sortPatients(filtered, sort);
  }, [patients, search, sort]);

  return (
    <ClinicalShell>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="space-y-1">
          <h1 className="font-serif text-4xl font-normal tracking-tight">
            Patients
          </h1>
          <p className="text-sm text-muted-foreground">
            Browse patient records and open recent clinical sessions
          </p>
        </div>

        <div className="relative">
          <RiSearchLine className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patients by name, MRN, phone, or DOB..."
            className="h-10 pl-9"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {patients
              ? `${filteredPatients.length} patient${filteredPatients.length === 1 ? "" : "s"}`
              : "Loading patients..."}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort:</span>
            <Select
              value={sort}
              onValueChange={(value) => setSort(value as SortOption)}
            >
              <SelectTrigger className="h-8 w-[160px]" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_updated">Last updated</SelectItem>
                <SelectItem value="name_asc">Name (A–Z)</SelectItem>
                <SelectItem value="name_desc">Name (Z–A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {!patients ? (
          <PatientListSkeleton />
        ) : filteredPatients.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm font-medium">No patients found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your search terms
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredPatients.map((patient) => (
              <PatientCardItem key={patient.patient_id} patient={patient} />
            ))}
          </div>
        )}
      </div>
    </ClinicalShell>
  );
}
