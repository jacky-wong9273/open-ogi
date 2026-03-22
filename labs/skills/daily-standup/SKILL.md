---
name: Daily Stand-up
id: daily-standup
version: "1.0.0"
description: Collect status from team members, identify blockers, produce stand-up summary
input_schema:
  type: object
  properties:
    sprint_number:
      type: number
    sprint_day:
      type: number
    participants:
      type: array
      items:
        type: object
        properties:
          agent_id: { type: string }
          done: { type: string }
          doing: { type: string }
          blocked: { type: string }
  required: [sprint_number, participants]
output_format: markdown
---

# Daily Stand-up Skill

Collect and summarise daily status from each team member. Highlight blockers
that need escalation.

## Process

1. Collect status from each participant: Done / Doing / Blocked.
2. Identify any blockers and classify urgency.
3. Check if sprint burndown is on track.
4. Produce a formatted summary.

## Blocker Escalation Rules

- If a blocker has been open > 1 day, mark as **urgent**.
- If a blocker is cross-team, tag it for scrum-master escalation.
- If a blocker affects the sprint goal, flag it prominently.

## Output Format

```markdown
🟢 Daily Stand-up — Sprint {N}, Day {D}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**{agent_id}**
✅ Done: {done}
🔄 Doing: {doing}
🚫 Blocked: {blocked or "None"}

---

📊 Sprint Progress: {X}/{Y} points completed
⚠️ Active Blockers: {count}
{blocker details if any}
```
