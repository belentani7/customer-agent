import { z } from "zod";

export interface DecisionSignals {
  intent?: string;
  sentiment?: string;
}

export function shouldEscalate({ intent, sentiment }: DecisionSignals): boolean {
  return sentiment === "urgente" || sentiment === "negativo" || intent === "cancelacion";
}

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

export type ValidatedDecision = ReturnType<typeof parseAssistantDecision>;

/**
 * Escalation is an operational action, not a boolean attached to a closure.
 * Refunds, discounts, ticket closures and other state-changing operations need
 * explicit human/business authorization; a model cannot approve them.
 */
export function enforceSafeDecision(decision: ValidatedDecision, flagged: boolean): {
  action: "responder" | "escalar";
  response: string;
  escalate: boolean;
} {
  if (flagged || !decision.valid ||
      decision.action === "ofrecer_descuento" || decision.action === "cerrar_ticket" ||
      decision.action === "escalar") {
    return {
      action: "escalar",
      response: "Hemos recibido tu consulta. Nuestro equipo la revisará.",
      escalate: true,
    };
  }
  return { action: "responder", response: decision.response, escalate: false };
}
