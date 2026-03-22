---
name: Code Analyzer
id: code-analyzer
version: "1.0.0"
description: Static analysis and linting via ESLint and custom rules
type: development
config:
  eslint_config: .eslintrc.json
  custom_rules_dir: .analyzer/rules
---

# Code Analyzer Tool

Enables agents to run static analysis, linting, and code quality checks
on source files.

## Capabilities

- **Lint files** using ESLint with project config
- **Run type check** via TypeScript compiler
- **Analyse complexity** (cyclomatic, cognitive)
- **Check dependencies** for known vulnerabilities
- **Generate quality report** with metrics

## API Methods

### lint

```json
{
  "action": "lint",
  "params": {
    "paths": ["string (file or directory paths)"],
    "fix": false,
    "format": "stylish | json"
  }
}
```

### typeCheck

```json
{
  "action": "typeCheck",
  "params": {
    "project": "string (tsconfig path, default: tsconfig.json)"
  }
}
```

### analyseComplexity

```json
{
  "action": "analyseComplexity",
  "params": {
    "paths": ["string"],
    "threshold": 10
  }
}
```

### auditDependencies

```json
{
  "action": "auditDependencies",
  "params": {
    "severity": "low | moderate | high | critical"
  }
}
```

### qualityReport

```json
{
  "action": "qualityReport",
  "params": {
    "paths": ["string"],
    "include_metrics": ["lint", "types", "complexity", "coverage"]
  }
}
```

## Output Format

```markdown
## Quality Report — {path}

| Metric         | Value | Threshold | Status |
| -------------- | ----- | --------- | ------ |
| Lint errors    | 3     | 0         | ❌     |
| Type errors    | 0     | 0         | ✅     |
| Max complexity | 8     | 10        | ✅     |
| Coverage       | 85%   | 80%       | ✅     |

### Issues

1. [error] foo.ts:42 — Unexpected any. Use specific type.
2. [warning] bar.ts:10 — Function has complexity 12 (threshold 10).
```
