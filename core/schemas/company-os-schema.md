# Company OS Schema

Every company instance should eventually include these areas.

## Required

- Company profile
- Offers
- Customer types
- Departments
- Workflows
- Approval rules
- Agent recipes
- Memory entries

## Recommended

- Source inventory
- Tool inventory
- Project list
- Client list
- Pricing notes
- Risk register
- Decision log
- Review queue

## Entity Summary

### Company

- Name
- Slug
- Industry
- Description
- Leader
- Tools
- Approval rules

### Source

- Company
- Source system
- Source type
- Title
- URL or object ID
- Access level
- Last ingested

### Note

- Company
- Source
- Raw extracted note
- Classification
- Confidence

### Memory Entry

- Company
- Category
- Claim
- Details
- Source references
- Confidence
- Status

### Agent Recipe

- Name
- Department
- Mission
- Inputs
- Tools
- Output format
- Approval requirements

### Task

- Company
- Project
- Goal
- Assigned recipe
- Context
- Status
- Output
- Review decision

### Artifact

- Company
- Task
- Type
- Location
- Version
- Review status
