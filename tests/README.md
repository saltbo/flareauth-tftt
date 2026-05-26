# Test Layout

Vitest owns code-level verification and coverage. Cucumber owns end-to-end
product journeys from the source specs in `../specs`.

## Vitest

- `unit`: pure logic, small module factories, and isolated runtime helpers.
- `component`: React component and routed-page tests. Mocked API responses are
  allowed here, but these tests are not E2E.
- `contract`: shared schema and API client contract tests.
- `integration`: in-process Hono, D1 repository, OpenAPI, and server flow tests.

Do not put browser journey specs in these directories. If a test verifies a
user journey through the product UI or Restish, define the scenario in `../specs`
and implement it with Cucumber steps in `e2e`.

## Cucumber E2E

- Feature files live only in `../specs`.
- Step definitions, hooks, and runtime helpers live in `e2e`.
- `../specs/e2e-coverage.json` declares the currently automated journey set.
