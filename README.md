# MGWAIOS

MGWAIOS is a reusable company operating system for company-aware AI workflows.

It is designed to:

- Install a structured AI operating layer into any company.
- Keep reusable platform logic separate from company-specific knowledge.
- Use disposable worker agents for scoped tasks.
- Store durable memory outside the agent.
- Preserve source provenance and approval boundaries.
- Support owner/operator interaction through Telegram and a future web dashboard.

## Current Status

This repository currently contains the planning and operating structure for v1:

- Architecture docs
- V1 roadmap
- Company onboarding method
- Reusable templates
- MGWAI LLC as the first company instance

Application code will be scaffolded after the operating model is stable.

## Repository Structure

```text
docs/
  Architecture, roadmap, onboarding, and deployment notes.

core/
  Reusable platform specifications and future source code areas.

company-os/templates/
  Portable Markdown templates used to install any company.

company-os/companies/
  Company-specific instances and memory.
```

## Core Pattern

```text
Request
  -> Orchestrator
  -> Task Packet
  -> Agent Recipe
  -> Disposable Worker
  -> Reviewed Output
  -> Memory Update
```

## First Company Instance

MGWAI LLC lives at:

```text
company-os/companies/mgwai-llc/
```

## Planned Technical Stack

- TypeScript
- Node.js
- React or Next.js
- Supabase Postgres
- pgvector
- Redis and BullMQ
- OpenAI Responses API / Agents SDK
- Telegram Bot API
- DigitalOcean Linux deployment with Docker

## Next Build Step

Scaffold the TypeScript monorepo:

```text
apps/web
apps/api
apps/worker
packages/core
packages/db
packages/agents
packages/connectors
packages/shared
```
