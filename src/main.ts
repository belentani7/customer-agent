import { Kafka, logLevel } from "kafkajs";
import { customerRequestSchema } from "./request.js";
import { createLocalEscalation, resolveCustomerDecision } from "./privacy.js";

const BROKERS = (process.env.KAFKA_BROKERS ?? "localhost:9092").split(",");
const CLIENT_ID = process.env.KAFKA_CLIENT_ID ?? "customer-agent";
const GROUP_ID = process.env.KAFKA_GROUP_ID ?? "customer-agent-group";
const INPUT_TOPIC = process.env.INPUT_TOPIC ?? "customer.requests";
const OUTPUT_TOPIC = process.env.OUTPUT_TOPIC ?? "customer.decisions";
const MAX_EVENT_BYTES = 16 * 1024;

const kafka = new Kafka({
  clientId: CLIENT_ID,
  brokers: BROKERS,
  logLevel: logLevel.INFO,
});

const consumer = kafka.consumer({ groupId: GROUP_ID });
const producer = kafka.producer();

async function run() {
  await consumer.connect();
  await producer.connect();
  await consumer.subscribe({ topic: INPUT_TOPIC, fromBeginning: false });

  console.log("[customer-agent] listening on " + INPUT_TOPIC);

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value || message.value.byteLength > MAX_EVENT_BYTES) {
        console.warn("[customer-agent] rejected empty or oversized event");
        return;
      }
      let untrusted: unknown;
      try {
        untrusted = JSON.parse(message.value.toString());
      } catch {
        console.warn("[customer-agent] rejected malformed JSON");
        return;
      }
      const parsed = customerRequestSchema.safeParse(untrusted);
      if (!parsed.success) {
        console.warn("[customer-agent] rejected invalid customer request");
        return;
      }
      const payload = parsed.data;

      try {
        const decision = await resolveCustomerDecision(
          payload,
          {
            allowRemoteLlm: process.env.ALLOW_REMOTE_LLM,
            hasApiKey: Boolean(process.env.OPENAI_API_KEY),
          },
          async (authorizedPayload) => {
            // Lazy import: without explicit opt-in the provider module is not loaded.
            const { customerGraph } = await import("./graph.js");
            const result = await customerGraph.invoke({
              customerId: authorizedPayload.customerId,
              message: authorizedPayload.message,
            });
            const action = result.action === "responder" && result.escalate === false
              ? "responder" : "escalar";
            const safeFallback = createLocalEscalation(authorizedPayload.customerId);
            return {
              customerId: authorizedPayload.customerId,
              intent: result.intent ?? "needs_review",
              sentiment: result.sentiment ?? "not_analyzed",
              action,
              response: action === "responder" && typeof result.response === "string" && result.response.trim()
                ? result.response : safeFallback.response,
              escalate: action === "escalar",
              timestamp: new Date().toISOString(),
              source: "customer-agent" as const,
            };
          },
        );

        await producer.send({
          topic: OUTPUT_TOPIC,
          messages: [{ key: payload.customerId, value: JSON.stringify(decision) }],
        });

        console.info("[customer-agent] decision sent", { escalate: decision.escalate });
      } catch (err) {
        console.error("[customer-agent] processing failed; Kafka offset must remain retryable", { type: err instanceof Error ? err.name : "Unknown" });
        throw err;
      }
    },
  });
}

const shutdown = async () => {
  console.log("[customer-agent] shutting down...");
  await consumer.disconnect();
  await producer.disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

run().catch((err) => {
  // Do not dump provider errors: they may contain keys, prompts or customer PII.
  console.error("[customer-agent] fatal", { type: err instanceof Error ? err.name : "Unknown" });
  process.exit(1);
});
