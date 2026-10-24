# Customer Agent — private Kafka customer-message processor

Backend component for a customer-support workflow. It consumes validated JSON events from Kafka (`customer.requests`) and produces review/decision events (`customer.decisions`). It is **not** a public web interface, a verified production service or an authorized autonomous ticket-closure system. Code license: MIT (see `LICENSE`).

## Default privacy behavior

**No remote model is called by default.** Without all three conditions — `ALLOW_REMOTE_LLM=true` in the service environment, a configured `OPENAI_API_KEY`, and explicit `"remoteConsent": true` on the individual event — the service emits a generic **human-review escalation** and does not load the LLM module. No model-generated response is returned in that path. This is a software gate, not a legal consent-management system: upstream services must establish and record valid consent, minimize personal data and provide withdrawal handling. Kafka itself stores the original input; broker access, retention, encryption and deletion require separate controls.

Example input (defaults to local human review):

```json
{"customerId":"client-001","message":"Necesito hablar con soporte"}
```

For an authorized remote request only, the upstream producer may add `"remoteConsent": true`. This **still does not** activate external processing unless the operator has explicitly enabled `ALLOW_REMOTE_LLM=true` and configured an API key. The remote path sends the customer message to the model provider; do not enable it for sensitive personal, medical, financial or third-party content without a lawful basis, notice and safeguards.

`customerId` must be a nonempty string of at most 128 characters, `message` a nonempty string of at most 4000 characters. Unexpected fields and nonboolean consent are rejected. Events above 16 KiB are rejected before JSON parsing. Invalid events are currently acknowledged and dropped without a dead-letter queue; do not rely on this as durable error recovery.

## Output

A JSON event with `customerId`, `intent`, `sentiment`, `action`, `response`, `escalate`, `timestamp` and `source`. Without consent it has `intent=needs_review`, `sentiment=not_analyzed`, `action=escalar`, `escalate=true`. No ticket, refund, discount or other business-side operation is executed by this repository. The remote path still requires independent quality and safety validation.

## Local development (not production approval)

Requires Node.js and a Kafka broker. `OPENAI_API_KEY` is optional in the default local-only mode. Never commit real credentials. Configuration keys are in `.env.example` (the runtime reads process environment variables; it does **not** automatically load `.env`).

```bash
npm install
npm test
npm run build
npm start
```

The repository currently has **no dependency lockfile** and no verified Kafka integration/E2E suite. `npm install` is not a reproducible lockfile-based install. Do not deploy until dependencies and license/security review, actual broker integration, error handling, retry/DLQ and idempotency, CI, privacy and rollback are verified. Kafka publish failures are propagated to keep offsets retryable, but duplicates may occur after retries. The previous generic README claim of automated publication was not supported by deployment evidence.
