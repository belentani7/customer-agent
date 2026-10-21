import assert from "node:assert/strict";
import test from "node:test";
import { shouldEscalate } from "../src/decision.ts";
import { customerRequestSchema } from "../src/request.ts";

test("escalates urgent or negative sentiment", () => {
  assert.equal(shouldEscalate({ sentiment: "urgente" }), true);
  assert.equal(shouldEscalate({ sentiment: "negativo" }), true);
});

test("escalates cancellation requests", () => {
  assert.equal(shouldEscalate({ intent: "cancelacion" }), true);
});

test("does not escalate ordinary support requests", () => {
  assert.equal(shouldEscalate({ intent: "soporte_tecnico", sentiment: "neutral" }), false);
});

test("accepts a well-formed request and strips surrounding whitespace", () => {
  const parsed = customerRequestSchema.parse({ customerId: "  customer-1  ", message: "  Hola  " });
  assert.deepEqual(parsed, { customerId: "customer-1", message: "Hola" });
});

test("rejects empty, oversized or structurally unexpected customer messages", () => {
  const cases = [
    null, [], {},
    { customerId: "", message: "hola" },
    { customerId: "c1", message: "   " },
    { customerId: "c1", message: "x".repeat(4001) },
    { customerId: "x".repeat(129), message: "hola" },
    { customerId: "c1", message: "hola", priorityOverride: "admin" },
  ];
  for (const input of cases) {
    assert.equal(customerRequestSchema.safeParse(input).success, false);
  }
});
