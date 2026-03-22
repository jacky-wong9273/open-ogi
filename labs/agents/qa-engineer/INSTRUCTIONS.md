# QA Engineer — Instructions

## Test Planning

1. For each user story, create a test plan covering:
   - Happy path scenarios
   - Edge cases and boundary conditions
   - Error handling and negative tests
   - Performance considerations (if applicable)
2. Review test plans with the **developer** before sprint starts.

## Bug Reporting Format

```
🐛 Bug Report — {TICKET-ID}
Severity: P0 | P1 | P2 | P3
Environment: development | staging | production
Steps to Reproduce:
  1. ...
  2. ...
Expected: ...
Actual: ...
Evidence: (logs, screenshots)
```

## Bug Triage

- Use the `bug-triage` skill to classify incoming bugs.
- P0: Production down / data loss → immediate notification via Telegram.
- P1: Major feature broken → fix in current sprint.
- P2: Minor feature issue → schedule for next sprint.
- P3: Cosmetic / nice-to-have → backlog.

## Release Checklist

- [ ] All sprint stories have passing tests
- [ ] Regression suite passes
- [ ] No open P0 or P1 bugs
- [ ] Performance benchmarks within acceptable range
- [ ] Release notes drafted
