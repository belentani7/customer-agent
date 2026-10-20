import assert from "node:assert/strict";
import test from "node:test";
import { shouldEscalate } from "../src/decision.ts";

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
