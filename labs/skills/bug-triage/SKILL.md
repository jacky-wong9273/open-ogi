---
name: Bug Triage
id: bug-triage
version: "1.0.0"
description: Classify, prioritise, and assign incoming bugs
input_schema:
  type: object
  properties:
    bug_report:
      type: object
      properties:
        title: { type: string }
        description: { type: string }
        steps_to_reproduce: { type: string }
        environment: { type: string }
        severity_hint: { type: string }
        reporter: { type: string }
      required: [title, description]
    current_sprint_stories:
      type: array
      description: Active sprint stories for context
  required: [bug_report]
output_format: markdown
---

# Bug Triage Skill

Classify incoming bug reports, assign priority, identify likely owner,
and recommend next steps.

## Triage Process

1. **Validate** — Is this a real bug or a misunderstanding / duplicate?
2. **Classify** — Regression, new defect, environment issue, or expected behaviour?
3. **Prioritise** — Assign P0-P3 based on impact and urgency.
4. **Assign** — Identify the most appropriate developer based on component ownership.
5. **Recommend** — Suggest immediate actions.

## Priority Matrix

| Priority | Impact                      | Response Time  | Fix Deadline   |
| -------- | --------------------------- | -------------- | -------------- |
| P0       | Production down / data loss | Immediate      | Same day       |
| P1       | Major feature broken        | 2 hours        | Current sprint |
| P2       | Minor feature issue         | 1 business day | Next sprint    |
| P3       | Cosmetic / enhancement      | 1 week         | Backlog        |

## Output Format

```markdown
🐛 Bug Triage — {title}
━━━━━━━━━━━━━━━━━━━━━━

**Classification**: {regression | new defect | environment | not a bug}
**Priority**: P{0-3} — {justification}
**Assigned To**: {agent_id}
**Component**: {affected component}

### Analysis

{Brief root cause hypothesis}

### Recommended Actions

1. {action 1}
2. {action 2}

### Related

- {related tickets or stories if any}
```
