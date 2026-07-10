# hithink-finance-cli Agent Instructions

Read the monorepo root `AGENTS.md`, this directory's `README.md`, and the current
`package.json` scripts before changing this subproject.

- Treat `hithink-finance-cli/` as the Node.js project root.
- Keep the runtime, commands, database, and implementation independent from `../python/`.
- Implement behavior test-first and keep machine-readable stdout separate from diagnostics on stderr.
- Never write API keys or other credentials to configuration, fixtures, logs, or commits.
- Keep CLI documentation focused on commands and runtime semantics; link `../docs/api/` instead of copying upstream response-field contracts.
- When command names, options, output/error semantics, or capability routing change, edit `scripts/generate-contracts.mjs`, run `npm run generate:contracts`, and commit the regenerated `skills/`, `schemas/`, and `skills/manifest.json` updates with the code change.
