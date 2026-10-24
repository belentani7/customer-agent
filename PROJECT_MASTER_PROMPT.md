# Customer Agent — project-specific operating context

## Identity and source of truth

This repository is a **private Kafka backend** for customer-support event processing, not a public website or production-certified customer-care agent. Canonical Factory index: **#190** in `belentani7/workflow-orchestrator/config/factory-canonical-inventory-2026-10-23.json`. Preserve its Git history and exact repository name. The current runtime contract lives in `src/main.ts`, `src/request.ts`, `src/privacy.ts`, `src/graph.ts` and `src/decision.ts`; `README.md` documents actual behavior. Existing draft PR #1 carries the more complete safety boundary; PR #2 overlaps and must be reconciled before any integration.

## Maximum useful safe product

A consent-aware, least-privilege customer-event processor with predictable local fallback, validated Kafka schemas, provider output allowlists, durable delivery, idempotency, observability without PII, explicit escalation and human authorization for business actions. Multi-tenant data separation and client rights require real architecture and tests before any claim of readiness. No customer data or paid AI processing during unattended checks.

## Delivery gates

1. Review current main SHA, open PRs and affected code; no duplicate branches or cross-partition edits.
2. Enforce **default no external AI call**, explicit deployment opt-in and per-event consent; test that a callback is never invoked without all gates.
3. Add Kafka broker integration tests for malformed input, retry, duplicate delivery, consumer offsets, dead-letter handling and recovery; verify using a disposable broker with no real customers.
4. Generate and verify dependency lockfile, run lint/typecheck/build/unit/integration tests and appropriate dependency/secret/workflow scans, including history as permitted.
5. CI must run on an actual runner and report executed steps. No merge/deploy on empty-step failure.
6. Verify legal basis, retention, security, independent diff review, backups/restore, authorized hosting, rollback and exact deployed SHA before release. Keep repo private; no public SEO/frontend claims.

## Reusable agent instruction

Read actual files and evidence first. Implement the smallest safe functional increment on an existing draft PR; test it with reproducible commands and distinguish isolated tests from full integration. Never call paid models, publish customer data, bypass CI or assert backups/restore without proof. Record `COHERENCIA PARCIAL`, `PRESERVACIÓN PARTIAL/BLOCKED` and exact pending gates in global issue #4 until independently verified.
