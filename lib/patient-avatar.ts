import { cn } from "@/lib/utils";

const PATIENT_AVATAR_PALETTE = [
  { bg: "bg-sky-100", text: "text-sky-800" },
  { bg: "bg-violet-100", text: "text-violet-800" },
  { bg: "bg-rose-100", text: "text-rose-800" },
  { bg: "bg-amber-100", text: "text-amber-800" },
  { bg: "bg-teal-100", text: "text-teal-800" },
  { bg: "bg-indigo-100", text: "text-indigo-800" },
  { bg: "bg-fuchsia-100", text: "text-fuchsia-800" },
  { bg: "bg-emerald-100", text: "text-emerald-800" },
] as const;

function hashPatientKey(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getPatientAvatarColor(patientId: string) {
  const index = hashPatientKey(patientId) % PATIENT_AVATAR_PALETTE.length;
  return PATIENT_AVATAR_PALETTE[index];
}

export function getPatientAvatarClassName(patientId: string) {
  const { bg, text } = getPatientAvatarColor(patientId);
  return cn(bg, text);
}

export function getPatientInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
