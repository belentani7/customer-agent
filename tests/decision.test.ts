import assert from "node:assert/strict";
import test from "node:test";
import { parseAssistantDecision, shouldEscalate } from "../src/decision.ts";
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

test("only allowlisted model actions are forwarded", () => {
  const allowed = parseAssistantDecision(JSON.stringify({
    action: "responder",
    response: "Te ayudamos con tu consulta.",
  }));
  assert.deepEqual(allowed, { action: "responder", response: "Te ayudamos con tu consulta.", valid: true });
});

test("malformed or unsafe model output escalates with an approved response", () => {
  const unsafe = [
    "not JSON",
    "null",
    JSON.stringify({ action: "delete_customer", response: "done" }),
    JSON.stringify({ action: "cerrar_ticket", response: 42 }),
    JSON.stringify({ action: "responder", response: "x".repeat(4001) }),
    JSON.stringify({ action: "responder", response: "OK", extra: "system_instruction" }),
  ];
  for (const message of unsafe) {
    const parsed = parseAssistantDecision(message);
    assert.equal(parsed.valid, false);
    assert.equal(parsed.action, "escalar");
    assert.equal(parsed.response, "Hemos recibido tu consulta. Nuestro equipo la revisará.");
  }
});
