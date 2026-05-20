# MGWAIOS Architecture

MGWAIOS is a transferable company operating system for creating company-aware AI workflows. It ingests business knowledge, turns it into structured company memory, and uses disposable task agents to produce work under clear rules.

## Core Thesis

The durable asset is not an individual agent. The durable asset is the company operating system:

- Company profile
- Offers and services
- Departments and roles
- Workflows
- Project records
- Client records
- Source-linked memory
- Agent recipes
- Task packets
- Decision history

Agents are created for a task, given the right context, produce work, record useful outcomes, and then disappear.

## Layers

### 1. Core Platform

Reusable infrastructure shared by every company instance.

- Agent factory
- Orchestrator
- Task runner
- Memory retrieval
- Connector manager
- Review board pattern
- Audit and provenance rules
- Template and schema library

### 2. Company Instance

A specific business installed into the OS.

Examples:

- MGWAI LLC
- TNW Travel
- Eco Fit Insulation
- A client software company
- A construction company
- A training organization

Each company has its own profile, workflows, departments, tools, risks, approval rules, and memory.

### 3. Worker Agents

Temporary agents created from recipes. They do not own durable memory.

Examples:

- Proposal writer
- Product discovery analyst
- Sales process analyst
- Data pipeline engineer
- Travel itinerary builder
- QA reviewer
- Training content builder

### 4. Interfaces

Ways humans interact with MGWAIOS.

- Telegram bot for owner/operator commands
- Web dashboard for review and management
- API for integrations
- Future client portals

## Recommended Technical Stack

### Frontend

- React or Next.js
- Tailwind CSS
- shadcn/ui or a similar component system

### Backend

- Node.js
- TypeScript
- Fastify or NestJS
- OpenAI Responses API and Agents SDK

### Data

- Supabase Postgres
- pgvector for semantic retrieval
- Supabase Storage or S3-compatible storage for documents

### Jobs

- BullMQ and Redis for v1 background work
- Temporal later if workflows become long-running and mission-critical

### Deployment

- DigitalOcean Ubuntu droplet
- Docker Compose
- Nginx
- HTTPS certificates
- GitHub Actions later

## High-Level Flow

```text
Owner / User
  -> Telegram or Web Dashboard
  -> API Server
  -> Orchestrator
  -> Task Packet
  -> Agent Factory
  -> Worker Agent
  -> Review / Approval
  -> Output Artifact
  -> Company Memory Update
```

## Ingestion Flow

```text
Source System
  -> Connector
  -> Raw Source Record
  -> Extraction Job
  -> Notes
  -> Classification
  -> Company Brain Draft
  -> Review
  -> Approved Memory
```

Preferred connectors are API-based and read-only:

- Microsoft Graph for SharePoint and OneDrive
- Salesforce REST API for CRM data
- Google Drive API
- Slack or Teams APIs

Browser automation should be used only when no proper API or export exists.

## Review Board Pattern

Use a multi-model or multi-agent review board only for high-impact decisions.

Good uses:

- Company profile v1 approval
- Automation opportunity ranking
- Security-sensitive workflow recommendations
- Client-facing deliverables
- Strategic roadmap recommendations

Avoid using a review board for every note or routine task. That will create cost, delay, and noise.

## Provenance

Important claims should track:

- Source name
- Source system
- Source URL or object ID when available
- Extracted date
- Confidence
- Used in
- Reviewer

Without provenance, the company brain becomes fragile. With provenance, it becomes auditable.

## Approval Boundaries

Agents should not perform these actions without explicit human approval:

- Send client-facing commitments
- Modify external systems
- Delete data
- Change billing
- Access sensitive employee information
- Make legal, HR, financial, or compliance determinations
- Book travel or make purchases
- Publish public content

## Transferability

MGWAIOS must work as both:

1. MGWAI LLC's internal operating layer.
2. A repeatable installable system for other companies.

That means templates, schemas, and workflows belong in reusable folders, while specific business facts belong inside company instances.
