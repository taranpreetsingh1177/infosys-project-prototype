"use client";

import {
  RiClipboardLine,
  RiMedicineBottleLine,
  RiStethoscopeLine,
  RiUserVoiceLine,
} from "@remixicon/react";
import type { ComponentType } from "react";

import { FindingListItem, SectionMenu } from "@/components/clinical/citation-text";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { SoapSection, SoapSectionKey } from "@/lib/types/session";

const SOAP_TAB_ICONS: Record<
  SoapSectionKey,
  ComponentType<{ className?: string }>
> = {
  subjective: RiUserVoiceLine,
  objective: RiStethoscopeLine,
  assessment: RiClipboardLine,
  plan: RiMedicineBottleLine,
};

interface SoapNoteEditorProps {
  patientName: string;
  sections: SoapSection[];
}

function getDefaultTab(sections: SoapSection[]): SoapSectionKey {
  const firstWithContent = sections.find((section) => section.findings.length > 0);
  return firstWithContent?.key ?? "subjective";
}

export function SoapNoteEditor({
  patientName,
  sections,
}: SoapNoteEditorProps) {
  const defaultTab = getDefaultTab(sections);

  return (
    <div className="flex w-full flex-col gap-6 rounded-xl border bg-card p-6">
      <h1 className="text-lg font-semibold">
        Session Note — {patientName}
      </h1>
      <Tabs defaultValue={defaultTab} className="flex flex-col gap-6">
        <TabsList className="grid w-full grid-cols-4">
          {sections.map((section) => {
            const Icon = SOAP_TAB_ICONS[section.key];
            return (
              <TabsTrigger key={section.key} value={section.key}>
                <Icon className="size-3.5 shrink-0" />
                <span className="hidden sm:inline">{section.title}</span>
                <span className="sr-only sm:hidden">{section.title}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
        {sections.map((section) => (
          <TabsContent key={section.key} value={section.key} className="mt-0">
            <div className="mb-4 flex justify-end">
              <SectionMenu />
            </div>
            <ul className="flex flex-col gap-3">
              {section.findings.map((finding) => (
                <FindingListItem key={finding.id} finding={finding} />
              ))}
            </ul>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
