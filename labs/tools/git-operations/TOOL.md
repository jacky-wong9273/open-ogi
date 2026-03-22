---
name: Git Operations
id: git-operations
version: "1.0.0"
description: Clone, branch, commit, push via local git CLI
type: development
config:
  git_binary: git
  default_remote: origin
---

# Git Operations Tool

Enables agents to perform git version control operations on local repos.

## Capabilities

- **Clone** a repository
- **Create branch** from a base branch
- **Checkout** an existing branch
- **Commit** staged changes
- **Push** to remote
- **Pull** latest changes
- **Get diff** for review
- **Get log** for recent commits

## API Methods

### clone

```json
{
  "action": "clone",
  "params": {
    "url": "string (HTTPS or SSH)",
    "directory": "string (local path)",
    "branch": "string (optional)"
  }
}
```

### createBranch

```json
{
  "action": "createBranch",
  "params": {
    "name": "string (branch name)",
    "baseBranch": "string (default: main)"
  }
}
```

### commit

```json
{
  "action": "commit",
  "params": {
    "message": "string",
    "files": ["string (paths to stage, or '.' for all)"]
  }
}
```

### push

```json
{
  "action": "push",
  "params": {
    "branch": "string",
    "remote": "string (default: origin)",
    "force": false
  }
}
```

### diff

```json
{
  "action": "diff",
  "params": {
    "base": "string (branch or commit, default: HEAD)",
    "target": "string (branch or commit, optional)"
  }
}
```

## Security Rules

- Never expose git credentials or SSH keys in output.
- `force` push is disabled by default — requires explicit admin approval.
- Only operate on repos within the approved workspace directory.
- All operations are logged to the audit trail.
