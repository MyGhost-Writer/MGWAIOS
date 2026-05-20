# MGWAIOS V1 Roadmap

The goal of v1 is not to build every connector or every department. The goal is to prove the operating loop:

```text
Company context -> task packet -> disposable worker -> reviewed output -> memory update
```

## Phase 0: Foundation

- Create architecture documentation.
- Create reusable company OS templates.
- Create MGWAI LLC as the first company instance.
- Define the disposable agent model.
- Define task packet and memory formats.

## Phase 1: Local Core

- Scaffold TypeScript monorepo.
- Add API app.
- Add worker app.
- Add shared core package.
- Add Supabase database schema.
- Add environment configuration.
- Add local Docker Compose for API, worker, and Redis.

## Phase 2: Company Memory

- Create database tables for companies, sources, notes, memory entries, agent recipes, tasks, and artifacts.
- Enable pgvector.
- Add embedding pipeline.
- Add hybrid search for company memory.
- Add Markdown import/export.

## Phase 3: Agent Factory

- Load agent recipes from Markdown.
- Create task packets from owner requests.
- Select a worker recipe.
- Run one worker using OpenAI.
- Save output artifacts.
- Save structured memory updates.

## Phase 4: Telegram Interface

- Create Telegram bot.
- Add webhook endpoint.
- Support commands:
  - `/companies`
  - `/ask <company> <question>`
  - `/task <company> <goal>`
  - `/status <task_id>`
  - `/memory <company> <topic>`
- Add owner authorization rules.

## Phase 5: Web Dashboard

- Company selector.
- Task inbox.
- Memory explorer.
- Agent recipe editor.
- Review queue.
- Source/provenance viewer.

## Phase 6: First Connector

Start with one ingestion path before broadening.

Recommended first path:

- Manual upload or folder import
- Markdown, PDF, DOCX, TXT, CSV
- Extract text
- Generate source notes
- Classify notes
- Build draft memory entries

Then add:

- Microsoft Graph for SharePoint and OneDrive
- Salesforce REST API

## Phase 7: DigitalOcean Deployment

- Provision Ubuntu droplet.
- Install Docker and Docker Compose.
- Configure Nginx.
- Add HTTPS.
- Deploy API and worker.
- Connect Supabase.
- Configure Telegram webhook.
- Add deployment notes.

## Success Criteria

V1 is successful when an owner can:

1. Create or select a company.
2. Add source knowledge.
3. Ask a question through Telegram or the dashboard.
4. Have MGWAIOS retrieve company context.
5. Spawn a task worker.
6. Receive a useful output.
7. Save the result back into memory with provenance.

## Non-Goals For V1

- Full autonomous browser control.
- Every enterprise connector.
- Complex multi-model boards for routine work.
- Fully automated external actions.
- Perfect UI.
- Permanent agents with unlimited memory.
