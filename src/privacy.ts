/** Remote AI processing is opt-in at BOTH the deployment and request levels. */
export interface RemoteProcessingRequest {
  remoteConsent?: boolean;
}

export interface RemoteProcessingConfig {
  allowRemoteLlm?: string;
  hasApiKey: boolean;
}

export function mayUseRemoteModel(
  request: RemoteProcessingRequest,
  config: RemoteProcessingConfig,
): boolean {
  return request.remoteConsent === true &&
    config.allowRemoteLlm === "true" &&
    config.hasApiKey === true;
}

export interface CustomerDecisionEvent {
  customerId: string;
  intent: string;
  sentiment: string;
  action: "responder" | "escalar";
  response: string;
  escalate: boolean;
  timestamp: string;
  source: "customer-agent";
}

/** Deterministic fallback: never transmits a customer's message to an AI vendor. */
export function createLocalEscalation(
  customerId: string,
  now: Date = new Date(),
): CustomerDecisionEvent {
  return {
    customerId,
    intent: "needs_review",
    sentiment: "not_analyzed",
    action: "escalar",
    response: "Hemos recibido tu consulta. Nuestro equipo la revisará.",
    escalate: true,
    timestamp: now.toISOString(),
    source: "customer-agent",
  };
}

/** Inject the provider callback so no provider is even loaded without both opt-ins. */
export async function resolveCustomerDecision<T extends RemoteProcessingRequest & { customerId: string }>(
  request: T,
  config: RemoteProcessingConfig,
  invokeRemote: (request: T) => Promise<CustomerDecisionEvent>,
): Promise<CustomerDecisionEvent> {
  if (!mayUseRemoteModel(request, config)) {
    return createLocalEscalation(request.customerId);
  }
  return invokeRemote(request);
}
