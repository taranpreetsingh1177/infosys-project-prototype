"use client";

import { ClinicalChat } from "@/components/clinical/clinical-chat";
import { ClinicalShell } from "@/components/clinical/clinical-shell";

export default function ChatPage() {
  return (
    <ClinicalShell>
      <div className="mx-auto flex w-full max-w-3xl flex-col">
        <ClinicalChat variant="page" />
      </div>
    </ClinicalShell>
  );
}
