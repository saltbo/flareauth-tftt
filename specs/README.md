# FlareAuth Specs

Specs are the product-facing source of truth for FlareAuth behavior. They
describe the feature, scenario, and verification path before any browser
automation is added.

## Format

- Use one `.feature` file per product area.
- Add `@journey:<id>` to every scenario that should be covered by automated E2E.
- Keep scenario steps user-facing. Implementation details belong in tests, not
  the spec.
- Use `Background` for setup that a reviewer also needs to know.
- Keep one scenario per behavior. If one Playwright test verifies multiple
  scenarios, attach all matching journey ids from that test.

## Verification

Automated E2E remains in `tests/e2e`, but it is now the verification adapter for
these specs. The coverage contract is:

1. Every journey id in `tests/e2e/journey-coverage.json` must appear in
   `specs/*.feature` as `@journey:<id>`.
2. Every journey id attached by Playwright through `attachCoverage(...)` must be
   declared in `tests/e2e/journey-coverage.json`.
3. `npm run spec:check` validates the contract without launching a browser.
4. `npm run test:e2e` runs `spec:check` before Playwright.

When adding a product feature, update the spec first, add or adjust the narrowest
verification path, and attach the matching journey id from the Playwright test.
