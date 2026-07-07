import { generateObject } from "ai";
import { clinicalScribeModel } from "@/lib/ai";
import { z } from "zod";
import { buildStructureSoapPrompt } from "@/agent/prompts";
import { getDefaultSoapSection } from "@/lib/finding-category";
import { getFindings, updateSession } from "@/lib/db";
import {
  SoapStructureSchema,
  type Finding,
  type SoapSection,
} from "@/lib/schema";

type SoapSectionKey = "subjective" | "objective" | "assessment" | "plan";
const SOAP_SECTION_KEYS: SoapSectionKey[] = [
  "subjective",
  "objective",
  "assessment",
  "plan",
];

/**
 * LLMs frequently fail to reproduce long opaque UUID finding_ids verbatim
 * (the same issue documented for line_id citations in extractFindings.ts).
 * Using short sequential aliases ("F1", "F2", ...) in the prompt makes it
 * far more likely the model's returned finding_ids actually resolve back to
 * real findings, so findings land in the SOAP section the model intended
 * instead of silently becoming unmatched "orphans".
 */
function buildAliasMap(findings: Finding[]): Map<string, string> {
  const map = new Map<string, string>();
  findings.forEach((finding, index) => {
    map.set(`F${index + 1}`, finding.finding_id);
  });
  return map;
}

function resolveAliasedFindingIds(
  aliases: string[],
  aliasToId: Map<string, string>,
): string[] {
  const resolved: string[] = [];
  for (const raw of aliases) {
    const alias = raw.trim().toUpperCase();
    const id = aliasToId.get(alias);
    if (id) resolved.push(id);
  }
  return [...new Set(resolved)];
}

export async function structureSoapExecute(input: {
  sessionId: string;
}): Promise<{ sections: string[] }> {
  "use step";

  const findings = await getFindings(input.sessionId);
  const verifiedFindings = findings.filter(
    (finding) => finding.verification_status === "verified",
  );

  // If verification failed to confirm most/any findings (e.g. an upstream
  // citation mismatch), fall back to non-contradicted findings so the note
  // is not left entirely blank. Verified findings are always preferred when
  // available.
  const usableFindings =
    verifiedFindings.length > 0
      ? verifiedFindings
      : findings.filter((finding) => finding.verification_status !== "contradicted");

  const aliasToId = buildAliasMap(usableFindings);
  const findingsSummary = usableFindings
    .map((finding, index) => {
      const alias = `F${index + 1}`;
      return `${alias} | ${finding.type} | ${finding.value} | polarity=${finding.polarity} | lines=${finding.source_lines.join(",")}`;
    })
    .join("\n");

  const { object } = await generateObject({
    model: clinicalScribeModel,
    schema: SoapStructureSchema,
    prompt: buildStructureSoapPrompt(findingsSummary),
  });

  const sections: Record<SoapSectionKey, SoapSection> = {
    subjective: {
      narrative: object.subjective.narrative,
      finding_ids: resolveAliasedFindingIds(
        object.subjective.finding_ids,
        aliasToId,
      ),
    },
    objective: {
      narrative: object.objective.narrative,
      finding_ids: resolveAliasedFindingIds(
        object.objective.finding_ids,
        aliasToId,
      ),
    },
    assessment: {
      narrative: object.assessment.narrative,
      finding_ids: resolveAliasedFindingIds(
        object.assessment.finding_ids,
        aliasToId,
      ),
    },
    plan: {
      narrative: object.plan.narrative,
      finding_ids: resolveAliasedFindingIds(object.plan.finding_ids, aliasToId),
    },
  };

  // Any finding the model didn't reference by alias (or referenced with a
  // malformed alias) still needs a home — assign it deterministically by
  // category rather than letting it fall through to a single catch-all
  // section downstream.
  const referencedIds = new Set(
    SOAP_SECTION_KEYS.flatMap((key) => sections[key].finding_ids),
  );
  for (const finding of usableFindings) {
    if (referencedIds.has(finding.finding_id)) continue;
    const section = getDefaultSoapSection(finding.type);
    sections[section].finding_ids.push(finding.finding_id);
  }

  await updateSession(input.sessionId, {
    soap: sections,
  });

  return {
    sections: SOAP_SECTION_KEYS,
  };
}

export const structureSoapTool = {
  description:
    "Group verified findings into SOAP sections with clinical narratives.",
  inputSchema: z.object({
    sessionId: z.string(),
  }),
  execute: structureSoapExecute,
};
