# E2E Verification

The product behavior and executable Cucumber scenarios are described in
`../../specs`. This directory contains only E2E step glue, support code, and
runtime helpers for the two supported user entry points:

- `@entrypoint:product-ui`: browser journeys through hosted product pages.
- `@entrypoint:restish`: Restish journeys through the Management API contract.

Cucumber owns E2E execution. Playwright is used inside step definitions only for
browser and HTTP automation.

`../../specs/e2e-coverage.json` is the explicit Cucumber automation contract.
Source specs can contain more product journeys than the Cucumber suite executes,
but every automated journey must be declared there and tagged `@e2e` in
`../../specs`.

When adding or changing a product journey:

1. Update the relevant `specs/*.feature` source scenario.
2. Tag the scenario with the matching `@entrypoint:<id>` and `@journey:<id>`.
3. Add `@e2e` and update `../../specs/e2e-coverage.json` when the journey should
   be automated.
4. Implement the step in `steps` or shared support code.
5. Run `npm run spec:check` before the Cucumber suite.
