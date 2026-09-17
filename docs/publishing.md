# Publishing to npm

Tempalace has two public npm packages:

- `@tempalace/core`, the TypeScript library
- `tempalace`, the CLI

The workspace root remains private and must not be published.

## Release preflight

Run this command from the repository root before changing versions or publishing:

```sh
pnpm publish:check
```

It runs strict TypeScript checks, `node:test`, builds both packages, and runs `pnpm pack --dry-run` for each package. Confirm that each tarball contains only generated `dist` files, its package README, its license, and package metadata.

## Versioning

Update `version` in both package manifests when releasing compatible `@tempalace/core` and `tempalace` versions. The CLI uses the pnpm `workspace:*` protocol for its core dependency; pnpm replaces it with the released core version when packaging the CLI.

## Publish order

Authenticate to npm with an account authorized for the `@tempalace` scope and the `tempalace` package. Then publish the library first, followed by the CLI:

```sh
pnpm --filter @tempalace/core publish
pnpm --filter tempalace publish
```

Both manifests specify public access. The `prepublishOnly` lifecycle hook reruns type checks, tests, and builds before a publish. Do not use `--no-verify`.

If npm provenance is configured through a supported CI identity, add npm's `--provenance` option to each publish command.

## Post-publish checks

In a clean temporary project, install the published packages and verify:

```sh
pnpm add tempalace @tempalace/core zod
tp --version
```

Run a small `templates.ts` registry and verify direct invocation and interactive selection. Publish a corrective version instead of overwriting an immutable npm release.
