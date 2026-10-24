import { z } from "zod";

// Validate customer-originated Kafka payloads before invoking the LLM.
// Remote processing requires a per-event boolean consent; absent means false.
export const customerRequestSchema = z.object({
  customerId: z.string().trim().min(1).max(128),
  message: z.string().trim().min(1).max(4000),
  remoteConsent: z.boolean().optional(),
}).strict();

export type CustomerRequest = z.infer<typeof customerRequestSchema>;
