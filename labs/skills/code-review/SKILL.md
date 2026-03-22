---
name: Code Review
id: code-review
version: "1.0.0"
description: Structured code review with checklist output and severity classification
input_schema:
  type: object
  properties:
    diff:
      type: string
      description: The git diff or code to review
    language:
      type: string
      description: Primary programming language
    context:
      type: string
      description: PR description or additional context
  required: [diff]
output_format: markdown
---

# Code Review Skill

Perform a thorough code review on the provided diff. Evaluate across these
dimensions and output structured findings.

## Review Checklist

### Correctness

- Does the code do what it claims to do?
- Are edge cases handled?
- Are error paths correct?

### Security

- Input validation present?
- No hardcoded secrets or credentials?
- SQL injection / XSS / SSRF risks?
- Proper authentication / authorization checks?

### Performance

- No unnecessary loops or allocations in hot paths?
- Database queries optimised (N+1 problem)?
- Appropriate caching where beneficial?

### Maintainability

- Clear naming conventions?
- Functions are short and single-purpose?
- No unnecessary complexity?

### Testing

- New code has corresponding tests?
- Tests cover edge cases?
- No flaky test patterns?

## Output Format

```markdown
## Code Review — {filename or PR title}

### Summary

{1-2 sentence overview}

### Findings

| #   | Severity   | Category | File:Line | Description |
| --- | ---------- | -------- | --------- | ----------- |
| 1   | blocker    | security | foo.ts:42 | ...         |
| 2   | suggestion | perf     | bar.ts:10 | ...         |

### Verdict

- [ ] Approved
- [ ] Approved with suggestions
- [ ] Changes requested
```
