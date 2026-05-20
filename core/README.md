# Core

This folder is for reusable MGWAIOS platform logic and specifications.

Planned areas:

- `agent-factory/`: creates scoped disposable workers from agent recipes.
- `orchestration/`: turns owner goals into task packets and routes work.
- `connectors/`: read-only integrations for systems such as SharePoint and Salesforce.
- `schemas/`: structured definitions for companies, tasks, memory, sources, and artifacts.

Implementation should keep company-specific facts out of `core/`.
