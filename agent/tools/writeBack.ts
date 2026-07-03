import { z } from "zod";
import {
  getFindings,
  getInsights,
  getPatientMemoryBySourceSession,
  getSession,
  updateSession,
} from "@/lib/db";

export async function writeBackExecute(input: {
  sessionId: string;
}): Promise<{
  findings: number;
  insights: number;
  status: string;
}> {
  "use step";

  const session = await getSession(input.sessionId);
  if (!session) {
    throw new Error(`Session not found: ${input.sessionId}`);
  }

  const [findings, insights] = await Promise.all([
    getFindings(input.sessionId),
    getInsights(input.sessionId),
  ]);

  if (findings.length === 0) {
    throw new Error(
      `Cannot complete session ${input.sessionId}: no findings were persisted.`,
    );
  }

  if (!session.soap) {
    throw new Error(
      `Cannot complete session ${input.sessionId}: SOAP note was not generated.`,
    );
  }

  const memory = await getPatientMemoryBySourceSession(input.sessionId);
  if (!memory) {
    throw new Error(
      `Cannot complete session ${input.sessionId}: patient memory was not created.`,
    );
  }

  if (session.status === "completed") {
    return {
      findings: findings.length,
      insights: insights.length,
      status: "completed",
    };
  }

  await updateSession(input.sessionId, { status: "completed" });

  return {
    findings: findings.length,
    insights: insights.length,
    status: "completed",
  };
}

export const writeBackTool = {
  description: "Mark the session complete after patient memory has been saved.",
  inputSchema: z.object({
    sessionId: z.string(),
  }),
  execute: writeBackExecute,
};
