export interface DecisionSignals {
  intent?: string;
  sentiment?: string;
}

export function shouldEscalate({ intent, sentiment }: DecisionSignals): boolean {
  return sentiment === "urgente" || sentiment === "negativo" || intent === "cancelacion";
}
