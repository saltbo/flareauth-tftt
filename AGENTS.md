# Repository Instructions

## Project

FlareAuth is a TypeScript auth service for Cloudflare Workers. It uses Hono,
Better Auth, Drizzle, React, Vite, Vitest, Biome, Wrangler, and Cloudflare D1.

## Development

- Use Node 24 and npm.
- Match the existing TypeScript, Hono, React, Drizzle, and Vitest patterns.
- Keep backend API contracts explicit and shared types centralized.
- For REST endpoints, use resource nouns, correct HTTP methods, correct status
  codes, consistent errors, pagination for collections, and idempotency where
  required.
- Do not add fallback or defensive logic inside trusted internal paths. Validate
  at user input, external API, network, database, and environment boundaries.
- Keep errors surfaced through the existing boundary handling instead of adding
  scattered try/catch blocks.

## Checks

Use the narrowest meaningful command for the change:

- Typecheck: `npm run typecheck`
- Tests: `npm test`
- Lint: `npm run lint`
- Format/fix: `npm run lint:fix`
- Build: `npm run build`

The project has a Husky pre-commit hook at `.husky/pre-commit` that runs:

```bash
npm run typecheck && npx lint-staged
```

Do not rely on CI for checks that can be run locally before commit.

## Architecture And Review

For user-facing work, describe the review-environment acceptance path in the PR:
how the reviewer reaches the environment, required setup or seed data, and the
exact product journey to verify.

Automated E2E tests and Leader review-environment acceptance are separate
feedback paths. Add automated E2E only when it is the right project-level check;
always make the Leader acceptance path clear for product changes.
