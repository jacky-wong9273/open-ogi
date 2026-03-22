---
name: Retrospective
id: retrospective
version: "1.0.0"
description: Gather team feedback, identify improvements, produce actionable items
input_schema:
  type: object
  properties:
    sprint_number:
      type: number
    velocity_achieved:
      type: number
    velocity_planned:
      type: number
    feedback:
      type: array
      items:
        type: object
        properties:
          agent_id: { type: string }
          went_well: { type: string }
          didnt_go_well: { type: string }
          suggestions: { type: string }
  required: [sprint_number, feedback]
output_format: markdown
---

# Retrospective Skill

Facilitate a sprint retrospective. Gather feedback, identify patterns,
and produce concrete action items for the next sprint.

## Process

1. Collect feedback from each team member.
2. Group feedback into themes (process, technical, collaboration, tooling).
3. Identify the top 3 improvements to focus on.
4. Create actionable items with owners and deadlines.
5. Review previous retro actions — were they completed?

## Analysis Guidelines

- Look for recurring themes across multiple team members.
- Celebrate wins — positive reinforcement matters.
- Be specific in action items: "Reduce CI build time by 30%" not "Improve CI".
- Limit action items to 3 per sprint to keep them achievable.

## Output Format

```markdown
📋 Sprint {N} Retrospective
━━━━━━━━━━━━━━━━━━━━━━━━━━

### Metrics

- Velocity: {achieved}/{planned} points ({percentage}%)
- Stories completed: {X}/{Y}

### ✅ What Went Well

- {theme}: {details}
- ...

### ❌ What Didn't Go Well

- {theme}: {details}
- ...

### 🔧 Action Items

| #   | Action | Owner | Due          |
| --- | ------ | ----- | ------------ |
| 1   | ...    | ...   | Sprint {N+1} |

### Previous Actions Status

| Action | Status                                    |
| ------ | ----------------------------------------- |
| ...    | ✅ Done / 🔄 In Progress / ❌ Not Started |
```
