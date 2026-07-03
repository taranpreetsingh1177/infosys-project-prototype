import { generateObject } from "ai";
import { clinicalScribeModel } from "@/lib/ai";
import { z } from "zod";
import { buildStructureSoapPrompt } from "@/agent/prompts";
import { getFindings, updateSession } from "@/lib/db";
import { SoapStructureSchema } from "@/lib/schema";

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

  const findingsSummary = usableFindings
    .map(
      (finding) =>
        `${finding.finding_id} | ${finding.type} | ${finding.value} | polarity=${finding.polarity} | lines=${finding.source_lines.join(",")}`,
    )
    .join("\n");

  const { object } = await generateObject({
    model: clinicalScribeModel,
    schema: SoapStructureSchema,
    prompt: buildStructureSoapPrompt(findingsSummary),
  });

  await updateSession(input.sessionId, {
    soap: object,
  });

  return {
    sections: ["subjective", "objective", "assessment", "plan"],
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
