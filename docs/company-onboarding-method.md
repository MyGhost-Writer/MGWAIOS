# Company Onboarding Method

This method installs a new company into MGWAIOS while keeping the reusable core unchanged.

## Purpose

Turn a business leader's knowledge, public research, and internal documents into a structured company operating layer that agents can safely use.

## Inputs

- Leader interview
- Public website and market research
- Existing process documents
- Sales materials
- Training materials
- CRM exports or read-only connector data
- SharePoint, Google Drive, Teams, Slack, or similar knowledge systems
- Existing templates, proposals, SOPs, and reports

## Onboarding Phases

### 1. Leader Conversation

Ask natural questions first:

- What does the company do in plain English?
- Who does it serve?
- What do customers buy?
- What happens from first contact to completed work?
- Where does work get stuck?
- What does the team repeat manually?
- What decisions require owner approval?
- What would make this system useful in the first week?

### 2. Public Research

Gather public context:

- Website
- Service pages
- Reviews
- Public social profiles
- Competitors
- Industry norms
- Pricing signals when available
- Regulatory or compliance considerations

### 3. Internal Source Review

Use read-only access whenever possible.

Source examples:

- SharePoint
- OneDrive
- Salesforce
- HubSpot
- Google Drive
- Learning systems
- Ticket systems
- Internal wikis

### 4. Notes And Classification

Every source should create notes before conclusions.

Classify notes into:

- Company identity
- Offers
- Customers
- Sales process
- Delivery process
- Operations
- Tools
- Risks
- Policies
- Training
- Repeated tasks
- Automation opportunities

### 5. Company Brain Draft

Generate first drafts:

- Company profile
- Offers
- Department map
- Workflow map
- Agent recipe recommendations
- Approval boundaries
- First automation opportunities

### 6. Review

Use human review for all company-defining outputs.

Use AI review board only for high-impact synthesis, not every note.

### 7. V1 Install

Save approved files into:

```text
company-os/companies/<company-slug>/
```

### 8. First Useful Deliverables

Produce something immediately useful:

- Sales follow-up script
- Proposal template
- Process map
- Training outline
- Automation roadmap
- Customer intake form
- Dashboard requirements

## Missing Context Detection

The onboarding process should identify missing information, including:

- Pricing
- Customer segments
- Approval rules
- Delivery steps
- Systems of record
- Compliance boundaries
- Current bottlenecks
- Owner preferences

## Done Criteria

A company is ready for v1 agent work when it has:

- Company profile
- Offers
- At least one workflow
- At least one department
- Approval rules
- Initial memory entries
- At least one useful agent recipe
