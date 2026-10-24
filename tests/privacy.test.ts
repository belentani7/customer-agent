import assert from "node:assert/strict";
import test from "node:test";
import { createLocalEscalation, mayUseRemoteModel, resolveCustomerDecision } from "../src/privacy.ts";

test("remote processing defaults to off without request consent", () => {
  assert.equal(mayUseRemoteModel({}, { allowRemoteLlm: "true", hasApiKey: true }), false);
  assert.equal(mayUseRemoteModel({ remoteConsent: false }, { allowRemoteLlm: "true", hasApiKey: true }), false);
});

test("remote processing defaults to off without deployment authorization", () => {
  assert.equal(mayUseRemoteModel({ remoteConsent: true }, { hasApiKey: true }), false);
  assert.equal(mayUseRemoteModel({ remoteConsent: true }, { allowRemoteLlm: "false", hasApiKey: true }), false);
  assert.equal(mayUseRemoteModel({ remoteConsent: true }, { allowRemoteLlm: "TRUE", hasApiKey: true }), false);
});

test("remote processing is disabled without a configured API key", () => {
  assert.equal(mayUseRemoteModel({ remoteConsent: true }, { allowRemoteLlm: "true", hasApiKey: false }), false);
});

test("remote processing requires all three explicit conditions", () => {
  assert.equal(mayUseRemoteModel({ remoteConsent: true }, { allowRemoteLlm: "true", hasApiKey: true }), true);
});

test("local fallback is a human escalation without model-generated text", () => {
  const event = createLocalEscalation("customer-1", new Date("2026-10-24T00:00:00.000Z"));
  assert.deepEqual(event, {
    customerId: "customer-1",
    intent: "needs_review",
    sentiment: "not_analyzed",
    action: "escalar",
    response: "Hemos recibido tu consulta. Nuestro equipo la revisará.",
    escalate: true,
    timestamp: "2026-10-24T00:00:00.000Z",
    source: "customer-agent",
  });
});

test("local fallback preserves a caller-owned ID but no message body", () => {
  const event = createLocalEscalation("safe-id", new Date(0));
  assert.equal(event.customerId, "safe-id");
  assert.equal(Object.hasOwn(event, "message"), false);
  assert.equal(event.escalate, true);
});

test("without consent the provider callback is never invoked", async () => {
  let calls = 0;
  const event = await resolveCustomerDecision(
    { customerId: "customer-1", message: "Private message" },
    { allowRemoteLlm: "true", hasApiKey: true },
    async () => { calls += 1; throw new Error("must not call provider"); },
  );
  assert.equal(calls, 0);
  assert.equal(event.action, "escalar");
  assert.equal(JSON.stringify(event).includes("Private message"), false);
});

test("with consent but disabled deployment the provider callback is never invoked", async () => {
  let calls = 0;
  await resolveCustomerDecision(
    { customerId: "customer-1", message: "Private message", remoteConsent: true },
    { allowRemoteLlm: "false", hasApiKey: true },
    async () => { calls += 1; throw new Error("must not call provider"); },
  );
  assert.equal(calls, 0);
});

test("only with full authorization is the remote callback invoked", async () => {
  let calls = 0;
  const result = await resolveCustomerDecision(
    { customerId: "customer-1", message: "Hola", remoteConsent: true },
    { allowRemoteLlm: "true", hasApiKey: true },
    async (request) => {
      calls += 1;
      assert.equal(request.message, "Hola");
      return createLocalEscalation(request.customerId, new Date(0));
    },
  );
  assert.equal(calls, 1);
  assert.equal(result.timestamp, "1970-01-01T00:00:00.000Z");
});
