---
name: Jira Integration
id: jira-integration
version: "1.0.0"
description: Create, update, query, and transition Jira issues
type: project-management
config:
  base_url_env: JIRA_BASE_URL
  email_env: JIRA_EMAIL
  api_token_env: JIRA_API_TOKEN
---

# Jira Integration Tool

Enables agents to interact with Jira for issue tracking, sprint management,
and project oversight.

## Capabilities

- **Create issue** (story, bug, task, epic)
- **Update issue** (summary, description, assignee, labels, priority)
- **Transition issue** (To Do → In Progress → Done)
- **Query issues** (JQL search)
- **Get sprint board** (active sprint, backlog)
- **Add comment** to an issue

## API Methods

### createIssue

```json
{
  "action": "createIssue",
  "params": {
    "project": "string (project key)",
    "issuetype": "Story | Bug | Task | Epic",
    "summary": "string",
    "description": "string",
    "priority": "Highest | High | Medium | Low | Lowest",
    "labels": ["string"],
    "assignee": "string (account ID, optional)"
  }
}
```

### searchIssues

```json
{
  "action": "searchIssues",
  "params": {
    "jql": "string (JQL query)",
    "fields": ["summary", "status", "assignee", "priority"],
    "maxResults": 50
  }
}
```

### transitionIssue

```json
{
  "action": "transitionIssue",
  "params": {
    "issueKey": "string (e.g. PROJ-123)",
    "transitionId": "string"
  }
}
```

### addComment

```json
{
  "action": "addComment",
  "params": {
    "issueKey": "string",
    "body": "string"
  }
}
```

## Security Rules

- Use API tokens, never passwords.
- Validate project key against allowlist.
- Log all write operations for audit.
- Respect Jira rate limits (avoid bulk operations in tight loops).
