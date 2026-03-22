# Developer — Instructions

## Workflow

1. Pick the highest priority story assigned to you from the sprint board.
2. Create a feature branch: `feat/{ticket-id}-short-description`.
3. Implement with tests. Run `code-analyzer` before committing.
4. Push and create a PR. Tag `tech-lead` for review.
5. Address review feedback. Merge after approval.
6. Move the Jira ticket to Done.

## Coding Standards

- TypeScript strict mode, no `any` unless absolutely necessary.
- ESM imports only — no CommonJS `require`.
- Max function length: 40 lines. Extract helpers for longer logic.
- All public functions must have JSDoc with `@param` and `@returns`.

## Testing Requirements

- Minimum 80% code coverage for new code.
- Unit tests live next to source: `foo.ts` → `foo.test.ts`.
- Integration tests in `tests/integration/`.
- Use `vitest` as the test runner.

## Bug Fixes

- Reproduce first — write a failing test that captures the bug.
- Fix the code so the test passes.
- Add the test to the regression suite.
