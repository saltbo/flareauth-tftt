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
- Keep one scenario per behavior. If one Cucumber scenario covers multiple
  paths, split the spec before automating it.

## Verification

Automated E2E remains in `tests/e2e`, but Cucumber now executes scenarios from
this `specs` directory. Playwright is only a browser and HTTP automation library
inside step definitions. The coverage contract is:

1. Source journeys live in `specs/*.feature` as `@journey:<id>`.
2. Every scenario must declare exactly one supported `@entrypoint:<id>` tag.
3. Scenarios tagged `@e2e` are executable Cucumber scenarios.
4. `specs/e2e-coverage.json` declares which journeys must currently be tagged
   `@e2e`.
5. `npm run spec:check` validates the contract without launching a browser.
6. `npm run test:e2e` runs `spec:check` before Cucumber.

When adding a product feature, update the source spec first, assign the matching
entrypoint, then add or adjust Cucumber step coverage when the journey should be
automated.
