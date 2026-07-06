"use client";

import { createContext, useContext, useState } from "react";
import { RiAddLine } from "@remixicon/react";

import { CreateSessionDialog } from "@/components/clinical/create-session-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface CreateSessionContextValue {
  openCreate: () => void;
}

const CreateSessionContext = createContext<CreateSessionContextValue | null>(
  null,
);

interface ClinicalShellProps {
  children: React.ReactNode;
}

export function ClinicalShell({ children }: ClinicalShellProps) {
  return (
    <div className="min-h-svh">
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

interface CreateSessionProviderProps {
  patientId: string;
  patientName?: string;
  children: React.ReactNode;
}

export function CreateSessionProvider({
  patientId,
  patientName,
  children,
}: CreateSessionProviderProps) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <CreateSessionContext.Provider
      value={{ openCreate: () => setCreateOpen(true) }}
    >
      {children}
      <CreateSessionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        patientId={patientId}
        patientName={patientName}
      />
    </CreateSessionContext.Provider>
  );
}

export function CreateSessionButton({
  label = "Create",
  size = "sm",
}: {
  label?: string;
  size?: "sm" | "default";
}) {
  const ctx = useContext(CreateSessionContext);
  if (!ctx) return null;

  return (
    <Button size={size} onClick={ctx.openCreate}>
      <RiAddLine data-icon="inline-start" />
      {label}
    </Button>
  );
}

export function useCreateSession() {
  return useContext(CreateSessionContext);
}

export function PatientListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-xl" />
      ))}
    </div>
  );
}

/** @deprecated Use PatientListSkeleton */
export function PatientGridSkeleton() {
  return <PatientListSkeleton />;
}
