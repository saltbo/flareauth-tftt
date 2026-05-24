# E2E Verification

The product behavior is described in `../../specs`. Files in this directory are
the Playwright verification adapter for those specs.

When adding or changing a product journey:

1. Update the relevant `specs/*.feature` scenario.
2. Add the journey id to `journey-coverage.json`.
3. Attach that id from the narrowest Playwright test with `attachCoverage(...)`.
4. Run `npm run spec:check` before the browser suite.
