import { Kafka, logLevel } from "kafkajs";
import { customerGraph, CustomerPayload } from "./graph.js";

const BROKERS = (process.env.KAFKA_BROKERS ?? "localhost:9092").split(",");
const CLIENT_ID = process.env.KAFKA_CLIENT_ID ?? "customer-agent";
const GROUP_ID = process.env.KAFKA_GROUP_ID ?? "customer-agent-group";
const INPUT_TOPIC = process.env.INPUT_TOPIC ?? "customer.requests";
const OUTPUT_TOPIC = process.env.OUTPUT_TOPIC ?? "customer.decisions";

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

  console.log(`[customer-agent] listening on ${INPUT_TOPIC}`);

  await consumer.run({
    eachMessage: async ({ message }) => {
      const raw = message.value?.toString() ?? "{}";
      let value: unknown;
      try {
        value = JSON.parse(raw);
      } catch {
        console.warn("[customer-agent] rejected malformed JSON");
        return;
      }
      const validation = CustomerPayload.safeParse(value);
      if (!validation.success) {
        console.warn("[customer-agent] rejected invalid message schema");
        return;
      }
      const payload = validation.data;

      try {
        const result = await customerGraph.invoke({
          customerId: payload.customerId,
          message: payload.message,
        });

        const decision = {
          customerId: result.customerId,
          intent: result.intent,
          sentiment: result.sentiment,
          action: result.action,
          response: result.response,
          escalate: result.escalate ?? false,
          timestamp: new Date().toISOString(),
          source: "customer-agent",
        };

        await producer.send({
          topic: OUTPUT_TOPIC,
          messages: [{ key: result.customerId, value: JSON.stringify(decision) }],
        });

        console.info("[customer-agent] decision sent");
      } catch (err) {
        console.error("[customer-agent] error processing", err instanceof Error ? err.name : "unknown");
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
  console.error("[customer-agent] fatal", err);
  process.exit(1);
});
