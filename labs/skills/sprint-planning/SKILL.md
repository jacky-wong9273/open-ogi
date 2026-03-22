---
name: Sprint Planning
id: sprint-planning
version: "1.0.0"
description: Facilitate sprint planning — story estimation, capacity calculation, sprint goal definition
input_schema:
  type: object
  properties:
    backlog:
      type: array
      description: Prioritised list of stories with title, description, acceptance criteria
    team_capacity:
      type: number
      description: Available story points for the sprint
    velocity_history:
      type: array
      description: Last 3-5 sprint velocities
    sprint_number:
      type: number
      description: The sprint number
  required: [backlog, sprint_number]
output_format: markdown
---

# Sprint Planning Skill

Facilitate a sprint planning session. Analyse the backlog, estimate
stories, and produce a sprint commitment.

## Process

1. **Review velocity** — Average the last 3-5 sprints to set capacity.
2. **Story estimation** — For each story, assess complexity, uncertainty, and effort.
   Use a Fibonacci scale: 1, 2, 3, 5, 8, 13.
3. **Capacity check** — Total committed points must not exceed team capacity.
4. **Sprint goal** — Synthesise a clear, measurable sprint goal.
5. **Risk identification** — Flag stories with high uncertainty or dependencies.

## Estimation Guidelines

- **1 point**: Trivial change, well-understood, no unknowns.
- **2 points**: Small change, straightforward, minimal risk.
- **3 points**: Moderate complexity, some unknowns.
- **5 points**: Significant effort, multiple unknowns, may need spike.
- **8 points**: Large story, consider splitting.
- **13 points**: Epic-sized — must be split before committing.

## Output Format

```markdown
## Sprint {N} Plan

### Sprint Goal

{Clear, measurable goal}

### Committed Stories

| #   | Story | Points | Assignee  | Risk |
| --- | ----- | ------ | --------- | ---- |
| 1   | ...   | 3      | developer | low  |

### Capacity

- Available: {X} points
- Committed: {Y} points
- Buffer: {X-Y} points

### Risks & Dependencies

- {risk 1}
- {risk 2}
```
