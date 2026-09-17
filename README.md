# Tempalace

Tempalace is an interactive-first CLI and TypeScript library for discovering and running reusable, schema-described functions. A template is ordinary JavaScript or TypeScript backed by Zod schemas. There is no template language, pipeline syntax, or composition DSL.

## Installation

Install the CLI and Zod in a project that contains trusted templates:

```sh
pnpm add -D tempalace @tempalace/core zod
```

## Five-minute quick start

Create `templates.ts` in the directory where you will run `tp`:

```ts
import { template } from '@tempalace/core'
import { z } from 'zod'

const greet = template({
  name: 'Greet',
  description: 'Generate a greeting',
  input: z.object({
    name: z.string(),
  }),
  output: z.string(),
  run: ({ name }) => `Hello ${name}`,
})

export default {
  greet,
}
```

Start the interactive flow:

```sh
tp
```

Or run a template directly:

```sh
tp greet +name Ada
```

## Templates

`template()` infers the function input and output from Zod. A template can be synchronous or asynchronous and can call any other TypeScript code.

```ts
const releaseNotes = template({
  name: 'Release notes',
  input: z.object({ version: z.string() }),
  output: z.string(),
  async run({ version }) {
    return `Release ${version}`
  },
})
```

Composition remains normal code. If one template needs another, import it and call `await other.run(input)` in its implementation. Tempalace deliberately has no CLI composition syntax.

Templates without input simply omit `input`; their `run` callback receives no argument. The CLI invokes them immediately after selection and does not show an input prompt.

```ts
const version = template({
  name: 'Version',
  output: z.string(),
  run: () => '1.0.0',
})
```

## Running templates

Registry keys are stable CLI IDs; template names are human-facing. `tp` discovers one registry in the current directory, without looking in parent directories. The filename precedence is `templates.ts`, `templates.mts`, `templates.cts`, `templates.js`, `templates.mjs`, then `templates.cjs`.

Override discovery when needed:

```sh
tp -r path/to/templates.ts greet +name Ada
```

`+` arguments belong to the template. Tempalace options use `-` or `--`:

```sh
tp greet +name Ada --json
tp version
```

Scalar `+` values are always strings. Tempalace does not convert `"1"`, `"true"`, or `"null"` automatically. Use an explicit structured representation for non-string data:

```sh
tp deploy +config:json '{"enabled":true}'
tp deploy +config:yaml 'enabled: true'
tp deploy --input-json '{"name":"Ada"}'
printf 'name: Ada\n' | tp deploy --input-yaml -
tp uppercase --input 'Ada'
tp square --input-json '42'
```

`--input` passes its value directly as a string. `--input-json` and `--input-yaml` can represent any value accepted by the schema, including strings, numbers, booleans, arrays, objects, and null. Use only one whole-input option. `+field` arguments may be combined with a structured object, but not with a primitive whole input.

## Interactive use

`tp` presents a searchable native selector showing each registry ID, name, and description. It asks directly for strings, string enums, optional strings, and schema defaults. Other shapes use an explicit JSON or YAML prompt. Invalid input and execution errors offer retry, another template, or exit rather than an uncontrolled stack trace.

Use `--non-interactive` for scripts. Direct invocation never opens prompts in the current release, so missing required input fails deterministically in both modes.

## Output

The default `auto` serializer prints strings unchanged and serializes other values as indented JSON. Choose a serializer explicitly:

```sh
tp summarize +text Ada --json
tp summarize +text Ada --yaml
```

Write output to the clipboard or a file. Destinations compose; when a destination is selected, output is not also printed to stdout.

```sh
tp greet +name Ada -c
tp greet +name Ada -o greeting.txt
tp greet +name Ada -o greeting.txt -c
```

## Template test cases

Templates can carry small data-driven test cases. They use deep strict equality. For richer assertions, write ordinary `node:test` tests.

```ts
const greet = template({
  name: 'Greet',
  input: z.object({ name: z.string() }),
  output: z.string(),
  run: ({ name }) => `Hello ${name}`,
  tests: [[{ name: 'Ada' }, 'Hello Ada']],
})
```

Run all declared cases or one template:

```sh
tp test
tp test greet
```

## API and architecture

The core package provides `Template`, `template()`, `invoke()`, registries, test-case execution, a registry-loader interface, an in-process executor, and a grammar extension interface. Registry loading and execution are intentionally separate seams for future isolation options.

See [the API reference](docs/api.md), [CLI reference](docs/cli.md), and [architecture](docs/architecture.md). Future work and non-goals are in [ROADMAP.md](ROADMAP.md).

## Publishing

Tempalace publishes two npm packages: `@tempalace/core` and `tempalace`. Run `pnpm publish:check` before a release. The full release sequence is documented in [docs/publishing.md](docs/publishing.md).

## Security model

Registries are trusted project code. Loading a registry executes it, and running a template executes its function in the current Node.js process. Tempalace v1 does not sandbox templates or claim purity. Review registries with the same care as build scripts and test configuration.
