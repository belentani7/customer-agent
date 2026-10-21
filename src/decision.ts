export interface DecisionSignals {
  intent?: string;
  sentiment?: string;
}

export function shouldEscalate({ intent, sentiment }: DecisionSignals): boolean {
  return sentiment === "urgente" || sentiment === "negativo" || intent === "cancelacion";
}

import { z } from "zod";

const decisionSchema = z.object({
  action: z.enum(["responder", "escalar", "ofrecer_descuento", "cerrar_ticket"]),
  response: z.string().trim().min(1).max(4000),
}).strict();

export function parseAssistantDecision(content: string): {
  action: z.infer<typeof decisionSchema>["action"];
  response: string;
  valid: boolean;
} {
  try {
    const result = decisionSchema.safeParse(JSON.parse(content));
    if (result.success) return { ...result.data, valid: true };
  } catch {
    // Invalid model output must never be treated as a machine-readable action.
  }
  return {
    action: "escalar",
    response: "Hemos recibido tu consulta. Nuestro equipo la revisará.",
    valid: false,
  };
}
