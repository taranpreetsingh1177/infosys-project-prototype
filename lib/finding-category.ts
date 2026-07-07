import type { ComponentType } from "react";
import {
  RiAlertLine,
  RiCapsuleLine,
  RiClipboardLine,
  RiFileList3Line,
  RiHeartPulseLine,
  RiHistoryLine,
  RiStethoscopeLine,
  RiTestTubeLine,
} from "@remixicon/react";

export type FindingCategory =
  | "symptom"
  | "allergy"
  | "objective"
  | "medication"
  | "assessment"
  | "plan"
  | "history"
  | "lab"
  | "general";

export interface FindingCategoryConfig {
  label: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  /** Full chip styles: light background + contrasting foreground */
  chip: string;
}

export const FINDING_CATEGORY_CONFIG: Record<
  FindingCategory,
  FindingCategoryConfig
> = {
  symptom: {
    label: "Symptom",
    icon: RiHeartPulseLine,
    color: "text-orange-800",
    bgColor: "bg-orange-100",
    chip: "bg-orange-100 text-orange-800 ring-orange-200/80",
  },
  allergy: {
    label: "Allergy",
    icon: RiAlertLine,
    color: "text-amber-900",
    bgColor: "bg-amber-100",
    chip: "bg-amber-100 text-amber-900 ring-amber-200/80",
  },
  objective: {
    label: "Exam",
    icon: RiStethoscopeLine,
    color: "text-teal-900",
    bgColor: "bg-teal-100",
    chip: "bg-teal-100 text-teal-900 ring-teal-200/80",
  },
  medication: {
    label: "Medication",
    icon: RiCapsuleLine,
    color: "text-blue-900",
    bgColor: "bg-blue-100",
    chip: "bg-blue-100 text-blue-900 ring-blue-200/80",
  },
  assessment: {
    label: "Assessment",
    icon: RiClipboardLine,
    color: "text-violet-900",
    bgColor: "bg-violet-100",
    chip: "bg-violet-100 text-violet-900 ring-violet-200/80",
  },
  plan: {
    label: "Plan",
    icon: RiClipboardLine,
    color: "text-indigo-900",
    bgColor: "bg-indigo-100",
    chip: "bg-indigo-100 text-indigo-900 ring-indigo-200/80",
  },
  history: {
    label: "History",
    icon: RiHistoryLine,
    color: "text-slate-800",
    bgColor: "bg-slate-200",
    chip: "bg-slate-200 text-slate-800 ring-slate-300/80",
  },
  lab: {
    label: "Lab",
    icon: RiTestTubeLine,
    color: "text-purple-900",
    bgColor: "bg-purple-100",
    chip: "bg-purple-100 text-purple-900 ring-purple-200/80",
  },
  general: {
    label: "General",
    icon: RiFileList3Line,
    color: "text-foreground",
    bgColor: "bg-muted",
    chip: "bg-muted text-foreground ring-border",
  },
};

const CATEGORY_RULES: { category: FindingCategory; keywords: string[] }[] = [
  { category: "symptom", keywords: ["symptom"] },
  { category: "allergy", keywords: ["allergy"] },
  { category: "objective", keywords: ["vital", "exam"] },
  { category: "medication", keywords: ["medication", "med"] },
  {
    category: "assessment",
    keywords: ["diagnosis", "differential", "assessment"],
  },
  { category: "plan", keywords: ["plan"] },
  {
    category: "history",
    keywords: [
      "history",
      "past_medical",
      "past_medical_history",
      "surgical",
      "social",
      "exposure",
      "family",
    ],
  },
  { category: "lab", keywords: ["lab", "test"] },
];

function normalizeType(type: string): string {
  return type.toLowerCase().trim().replace(/\s+/g, "_");
}

function typeMatchesKeyword(normalized: string, keyword: string): boolean {
  if (normalized === keyword) return true;

  const segments = normalized.split(/[._-]+/);
  if (segments[0] === keyword) return true;

  if (normalized.startsWith(`${keyword}.`) || normalized.startsWith(`${keyword}_`)) {
    return true;
  }

  if (keyword.includes("_") && normalized.includes(keyword)) {
    return true;
  }

  return false;
}

export function getFindingCategory(type: string): FindingCategory {
  const normalized = normalizeType(type);

  for (const { category, keywords } of CATEGORY_RULES) {
    if (keywords.some((keyword) => typeMatchesKeyword(normalized, keyword))) {
      return category;
    }
  }

  return "general";
}

/**
 * Deterministic SOAP section for a finding category. Used as a fallback
 * whenever a finding can't be placed by the structuring LLM's own
 * finding_ids (e.g. a malformed/unmatched reference) — every category maps
 * to a specific section instead of collapsing into a single catch-all, which
 * previously caused medications, labs, and exam findings to all show up
 * under Subjective.
 *
 * Note: this is a plain string union (not imported from lib/types/session)
 * to avoid a circular import — the two types are structurally identical.
 */
export function getDefaultSoapSection(
  type: string,
): "subjective" | "objective" | "assessment" | "plan" {
  switch (getFindingCategory(type)) {
    case "objective":
    case "lab":
      return "objective";
    case "assessment":
      return "assessment";
    case "medication":
    case "plan":
      return "plan";
    case "symptom":
    case "allergy":
    case "history":
    case "general":
    default:
      return "subjective";
  }
}
