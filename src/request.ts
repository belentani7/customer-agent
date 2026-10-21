import { z } from "zod";

// Validate customer-originated Kafka payloads before invoking the LLM.
// Keep identifiers short and bounded to avoid untrusted log and prompt content.
export const customerRequestSchema = z.object({
  customerId: z.string().trim().min(1).max(128),
  message: z.string().trim().min(1).max(4000),
}).strict();

export type CustomerRequest = z.infer<typeof customerRequestSchema>;
