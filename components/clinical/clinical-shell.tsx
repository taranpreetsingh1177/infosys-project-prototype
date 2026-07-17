"use client";

import { createContext, useContext, useState } from "react";
import { RiAddLine, RiChat3Line } from "@remixicon/react";

import { ClinicalChat } from "@/components/clinical/clinical-chat";
import { CreateSessionDialog } from "@/components/clinical/create-session-dialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="relative min-h-svh bg-background">
      <main className="flex-1 p-6">{children}</main>

      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetTrigger
          render={
            <Button
              size="icon-lg"
              className="fixed right-5 bottom-5 z-40 size-16 rounded-full border-0 bg-teal-700 text-white shadow-lg hover:bg-teal-800 hover:text-white"
              aria-label="Open clinical chat"
            />
          }
        >
          <RiChat3Line className="size-7" />
        </SheetTrigger>
        <SheetContent
          side="right"
          className="w-[min(100vw,48rem)] max-w-[min(100vw,48rem)] gap-0 bg-background p-0 !w-[min(100vw,48rem)] data-[side=right]:!w-[min(100vw,48rem)] data-[side=right]:sm:!max-w-[48rem] sm:!max-w-[48rem]"
        >
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-md bg-teal-700 text-white">
                <RiChat3Line className="size-4" />
              </span>
              Clinical Chat
            </SheetTitle>
            <SheetDescription className="sr-only">
              Ask the clinical assistant about patients, sessions, memory, and
              documents
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {chatOpen ? <ClinicalChat variant="drawer" /> : null}
          </div>
        </SheetContent>
      </Sheet>
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
