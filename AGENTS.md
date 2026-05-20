# MGWAIOS Agent Instructions

MGWAIOS is a reusable company operating system for building company-aware AI workflows. Treat this repository as both a product and an operating model.

## Working Principles

- Keep the reusable system separate from company-specific knowledge.
- Treat agents as disposable workers, not permanent memory stores.
- Store durable business knowledge in company instances, templates, task records, and source-linked memory.
- Preserve provenance for important facts: source, confidence, date observed, and where it was used.
- Prefer read-only connectors for external systems.
- Require human approval before operationally sensitive actions, external sends, data deletion, billing changes, or client-facing commitments.

## Repository Shape

- `core/` contains reusable orchestration concepts, schemas, connectors, and agent factory logic.
- `company-os/templates/` contains portable Markdown templates for onboarding any company.
- `company-os/companies/` contains company instances such as `mgwai-llc`.
- `docs/` contains architecture, roadmap, onboarding, deployment, and decision records.

## Agent Model

The default pattern is:

1. An orchestrator receives a business goal.
2. It creates a scoped task packet.
3. It selects or creates a worker from an agent recipe.
4. The worker receives only the needed company/project context.
5. Work output is reviewed when risk warrants it.
6. Durable results are written back to company memory.
7. The worker context is discarded.

## Implementation Bias

- Use TypeScript for app code unless a specific connector or ingestion task clearly benefits from Python.
- Use Supabase Postgres as the source of truth for structured data.
- Use pgvector for semantic memory.
- Use Markdown for human-readable operating knowledge and exportable company profiles.
- Use DigitalOcean Linux servers and Docker for deployment.
- Use Telegram as an owner/operator command interface, not as the only UI.
