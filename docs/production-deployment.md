# MGWAIOS Production And Demo Guide

This guide explains how to seed MGWAIOS with a demo company, show the workflow, deploy it for external testing, and delete company data safely.

## Current Architecture

MGWAIOS currently runs as:

```text
apps/web     Vite React dashboard
apps/api     Fastify API
apps/worker  one-shot worker runner
Supabase     Postgres database
OpenAI       task and simulation artifacts
```

## Local Demo Flow

Start from a migrated database:

```powershell
npm install
npm run db:migrate
npm run db:verify
```

Seed a demo company:

```powershell
npm run db:seed-demo
```

Default demo tenant:

```text
eco-fit-insulation-demo
```

The seed creates:

- A demo insulation company.
- Approved company memory.
- Department-head agents.
- Approval rules.
- One draft task.

Launch locally:

```powershell
npm run build
node apps/api/dist/index.js
```

In a second terminal:

```powershell
npm run dev:web
```

Open:

```text
http://127.0.0.1:5173
```

Demo steps:

1. Select `Eco Fit Insulation Demo` in the company selector.
2. Open the Agents section.
3. Select the Sales & Estimating Agent or Field Operations Agent.
4. Use Simulation Chat to ask the agent for work.
5. Review generated tasks and artifacts.
6. Use Run Worker for draft tasks.

## Safe Delete / Reset

Delete one company tenant:

```powershell
$env:COMPANY_SLUG="eco-fit-insulation-demo"
$env:CONFIRM_PURGE="eco-fit-insulation-demo"
npm run db:purge-company
```

Delete all company-owned data:

```powershell
$env:CONFIRM_PURGE_ALL="DELETE_ALL_COMPANY_DATA"
npm run db:purge-all-company-data
```

The all-company purge deletes rows from `companies`, which cascades through company-owned data:

- agent profiles
- memory entries
- tasks
- artifacts
- artifact files
- chat sessions
- chat messages
- sources
- notes
- decisions

It preserves reusable system tables:

- schema migrations
- personality presets

## Recommended External Test Deployment

For the first hosted test, use DigitalOcean App Platform.

Create two components from this GitHub repository.

### API Component

Type:

```text
Web Service
```

Build command:

```text
npm install && npm run build
```

Run command:

```text
npm run start -w @mgwaios/api
```

Environment variables:

```env
API_HOST=0.0.0.0
API_PORT=4000
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_DATABASE_URL=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.2
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
```

### Web Component

Type:

```text
Static Site
```

Build command:

```text
npm install && npm run build -w @mgwaios/web
```

Output directory:

```text
apps/web/dist
```

Environment variables:

```env
VITE_API_BASE_URL=https://your-api-service-url
```

## Domain Setup

Recommended DNS layout:

```text
app.yourdomain.com  -> web dashboard
api.yourdomain.com  -> API service
```

Recommended domain providers:

- Cloudflare Registrar
- Porkbun
- Namecheap

Keep the app private or unlisted until auth is added.

## Production Requirements Before Real Client Data

Before storing real customer data, add:

- Authentication.
- Role-based permissions.
- Row-level security or strict API tenant guards.
- Request logging.
- Rate limiting.
- Backups.
- Secret rotation.
- A clear data deletion policy.

## What Is Safe To Demo Now

Safe:

- Seeded demo company data.
- Simulated agent chat.
- Generated artifacts.
- Task and memory workflows.
- Internal testing with trusted users.

Not yet safe:

- Public unauthenticated access.
- Real client data.
- External actions such as sending email, booking travel, updating CRMs, or modifying SharePoint.
- Any production commitment without approval gates.

## Production Positioning

Use a public marketing site for SEO and lead capture:

```text
www.mgwaios.com
```

Keep the actual dashboard behind an app subdomain:

```text
app.mgwaios.com
```

Public pages should target small-business AI operating system searches:

- AI operating system for small business
- AI agents for service businesses
- business automation for contractors
- AI workflow dashboard
- custom AI agents for small teams
- AI sales and operations assistant

The private app itself should not be indexed.
