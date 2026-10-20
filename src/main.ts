import { Kafka, logLevel } from "kafkajs";
import { customerGraph, CustomerStateType } from "./graph.js";

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
      let payload: CustomerStateType;
      try {
        payload = JSON.parse(raw);
      } catch (e) {
        console.error("[customer-agent] invalid JSON", raw);
        return;
      }

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

        console.log("[customer-agent] decision sent", decision);
      } catch (err) {
        console.error("[customer-agent] error processing", err);
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
