# Tempalace implementation plan

## 1. Product definition

Tempalace is an interactive-first CLI and TypeScript library for discovering and invoking reusable, schema-described functions called templates.

A template is an ordinary JavaScript or TypeScript runtime object wrapping a callable:

```ts
Template<Input, Output>
```

Templates may:

- accept any input representable by their Zod input schema
- return any output representable by their Zod output schema
- be synchronous or asynchronous
- call other templates
- compose with arbitrary JavaScript or TypeScript code
- perform side effects

Tempalace does not define a template language.

The complete programming model is ordinary JavaScript or TypeScript. The CLI exposes only the subset that maps cleanly to an interactive shell.

Complex composition belongs in code, not in CLI syntax.

Tempalace may later support grammars that adapt other authoring formats, such as Mustache or MDX, into Template objects.

## 2. Core principles

### 2.1 Code is the semantic substrate

Template composition is ordinary function composition.

Tempalace does not implement:

- pipelines
- template-to-template CLI expressions
- selectors
- dataflow syntax
- partial semantics
- inheritance
- a template expression language
- a custom DSL

If a workflow becomes difficult to express through the CLI, write a script.

### 2.2 The CLI is intentionally less expressive than the API

The TypeScript API is the complete interface.

The CLI provides:

- discovery
- interactive selection
- argument collection
- validation
- execution
- output serialization
- clipboard and file output
- automation-friendly invocation

It does not attempt to reproduce arbitrary JavaScript composition.

### 2.3 Interactive use is the default

Running:

```sh
tp
```

starts an interactive workflow.

Automation is explicit.

The CLI should optimize first for:

```txt
find template
→ understand inputs
→ fill inputs
→ run
→ inspect/copy/save result
```

rather than optimizing first for non-interactive shell scripting.

### 2.4 No implicit CLI coercion

CLI scalar arguments are strings.

Tempalace does not guess whether:

```txt
"1"
"true"
"null"
"1,2,3"
```

represent numbers, booleans, nulls, or arrays.

Structured or non-string input must be provided explicitly using JSON or YAML.

Schema parsing validates values after the input representation has been explicitly chosen.

### 2.5 Trusted-code model

A registry is ordinary project code.

Loading a registry executes it.

Running a template executes its function.

Tempalace v1 does not claim that templates are pure or sandboxed.

This is considered acceptable for developer tooling in the same way that project configuration files, build scripts, test configuration, and shell scripts are trusted project code.

The implementation must nevertheless isolate registry loading and template execution behind internal interfaces so that future sandboxed or process-isolated executors can be added without redesigning the Template API.

### 2.6 Minimal metadata

A template's core contract contains only:

- name
- description
- input
- output

Additional metadata must be introduced only in response to a concrete use case.

No protocol version field is required in v1.

Schema evolution should remain backward-compatible where practical.

## 3. Repository and package architecture

Use a small workspace with separate packages.

Recommended structure:

```txt
tempalace/
  packages/
    core/
    cli/
  docs/
  examples/
  package.json
  README.md
  ROADMAP.md
```

Future packages may include:

```txt
packages/
  grammar-mustache/
  grammar-mdx/
```

but grammars are not required for the first release.

### 3.1 `@tempalace/core`

Contains:

- Template type
- `template()` constructor
- registry types
- invocation logic
- schema validation
- test-case support
- grammar interfaces
- registry-loading abstraction
- execution abstraction

No terminal UI code belongs here.

### 3.2 `tempalace` CLI package

Provides:

```sh
tp
```

and optionally:

```sh
tempalace
```

as a longer alias.

Contains:

- registry discovery
- interactive UI
- CLI argument parsing
- JSON/YAML input parsing
- serialization
- clipboard integration
- output file handling
- error presentation
- test command

The CLI depends on core.

Core never depends on the CLI.

## 4. Template API

### 4.1 Base type

The public abstraction should remain small:

```ts
import type { ZodType } from "zod"

export interface Template<I, O> {
  name: string
  description?: string
  input: ZodType<I>
  output: ZodType<O>
  run(input: I): O | Promise<O>
}
```

Prefer exposing templates through a constructor rather than encouraging users to manually satisfy the interface.

### 4.2 `template()` constructor

Example:

```ts
import { template } from "@tempalace/core"
import { z } from "zod"

export const greet = template({
  name: "Greet",
  description: "Generate a greeting",

  input: z.object({
    name: z.string(),
  }),

  output: z.string(),

  run({ name }) {
    return `Hello ${name}`
  },
})
```

The constructor must infer `Input` and `Output` from the supplied Zod schemas.

A mismatch between the inferred schema types and `run` should therefore be caught by TypeScript.

### 4.3 Async templates

Both forms are valid:

```ts
run(input) {
  return value
}
```

and:

```ts
async run(input) {
  return value
}
```

Internally, Tempalace should always normalize invocation through:

```ts
await Promise.resolve(template.run(input))
```

No separate async Template type is needed.

### 4.4 Invocation behavior

Core invocation performs:

```txt
raw input value
→ input schema parse
→ template.run()
→ await result
→ output schema parse
→ return validated output
```

Output validation is enabled by default.

Core should expose an option to skip output validation:

```ts
invoke(template, input, {
  validateOutput: false,
})
```

The CLI may later expose a corresponding advanced flag.

Input validation is never skipped during normal execution.

## 5. Registry model

### 5.1 Registry file

By default, the CLI looks in the current working directory for one of the supported fixed names.

Recommended precedence:

```txt
templates.ts
templates.mts
templates.cts
templates.js
templates.mjs
templates.cjs
```

Choose one deterministic order and document it.

Do not search parent directories.

Do not recursively search for registries.

Do not introduce project configuration solely for registry discovery.

### 5.2 Registry override

Support:

```sh
tp -r path/to/templates.ts
```

and:

```sh
tp --registry path/to/templates.ts
```

An explicit registry path bypasses default registry discovery.

### 5.3 Registry shape

The default export is a keyed object:

```ts
import { greet } from "./templates/greet"
import { fixtures } from "./templates/fixtures"

export default {
  greet,
  fixtures,
}
```

The object key is the stable CLI identifier.

The Template object's `name` is human-facing.

Therefore:

```txt
registry key: release-notes
display name: Release notes
```

The CLI invokes by registry ID:

```sh
tp release-notes
```

This avoids requiring display names to also satisfy CLI identifier constraints.

### 5.4 Registry validation

When loaded, Tempalace validates:

- default export is an object
- each value satisfies the Template runtime shape
- IDs are unique by construction
- values contain required metadata

Invalid entries should produce useful diagnostics without causing an uncontrolled process crash.

## 6. Registry loading

Use a runtime TypeScript/ESM loader such as jiti or an equivalent tool that supports common JS/TS module formats.

Registry loading belongs behind an internal interface:

```ts
interface RegistryLoader {
  load(path: string): Promise<TemplateRegistry>
}
```

The initial implementation may use:

```txt
JitiRegistryLoader
```

but the rest of the application must not depend directly on jiti.

This seam exists so future implementations can support:

- isolated worker loading
- subprocess loading
- sandboxed loading
- alternate JavaScript runtimes
- precompiled registries

No sandboxing is required in v1.

## 7. Execution abstraction

Even though execution is initially in-process, wrap invocation behind an internal executor:

```ts
interface TemplateExecutor {
  execute(
    template: Template<unknown, unknown>,
    input: unknown,
    options?: ExecutionOptions,
  ): Promise<unknown>
}
```

Initial implementation:

```txt
InProcessTemplateExecutor
```

Future possibilities:

```txt
WorkerTemplateExecutor
ProcessTemplateExecutor
SandboxTemplateExecutor
```

This must not alter the public Template type.

## 8. Input model

### 8.1 Interactive input

Interactive execution should inspect the Zod input schema and collect suitable values where straightforward.

Initial support should prioritize:

- `z.string()`
- string enums
- optional strings
- schema defaults
- simple objects containing supported fields

Do not block the first release on perfect interactive representation of every Zod construct.

For schemas the interactive UI cannot represent cleanly, offer an explicit structured-input path instead.

### 8.2 CLI argument convention

Retain the `+` convention for template inputs.

Example:

```sh
tp greet +name Alice
```

Tempalace's own options continue to use `-` and `--`.

This creates a visually obvious distinction between:

```txt
Tempalace options
-template invocation inputs
```

More accurately:

```txt
--registry
--json
--yaml
--clipboard
-o

+name
+subject
+message
```

No template-defined `--foo` options are introduced.

### 8.3 Scalar arguments

A CLI value supplied using:

```sh
+name Alice
```

is always passed initially as the string:

```ts
"Alice"
```

There is no implicit conversion.

Therefore a template whose input schema requires:

```ts
z.number()
```

cannot receive that value through ordinary scalar syntax unless its schema itself explicitly transforms a string.

For example:

```ts
z.string().transform(Number)
```

is an author-controlled choice.

Tempalace itself does not coerce.

### 8.4 Structured arguments

Provide explicit syntax for structured input.

The exact flags should be simple and orthogonal.

Recommended forms:

```sh
tp foo +config:json '{"enabled":true}'
```

and:

```sh
tp foo +config:yaml 'enabled: true'
```

If suffix syntax proves awkward during implementation, use explicit value flags instead, but preserve the principle:

```txt
structured parsing must be explicit at the point where the value enters the CLI
```

Also support whole-input structured payloads:

```sh
tp foo --input-json '{"name":"Alice"}'
```

```sh
tp foo --input-yaml 'name: Alice'
```

and stdin:

```sh
cat input.json | tp foo --input-json -
```

The implementation plan should prototype both per-field and whole-payload syntax before freezing the CLI surface.

### 8.5 Defaults

Defaults come only from the Zod schema.

Tempalace must not maintain a second default-value mechanism.

## 9. Interactive CLI

Running:

```sh
tp
```

should:

1. load the registry
2. display a searchable template selector
3. show name and description
4. allow selection
5. collect required inputs
6. apply schema defaults
7. validate input
8. execute
9. validate output
10. show result
11. allow output actions such as copy/save

A template execution failure returns the user to a usable interactive state rather than terminating the entire session where feasible.

### 9.1 Direct execution

Automation-oriented invocation:

```sh
tp greet +name Alice
```

should bypass template selection.

If required values are missing, the default behavior may still prompt interactively because Tempalace is interactive-first.

Provide an explicit non-interactive option:

```sh
tp greet +name Alice --non-interactive
```

In that mode:

- never prompt
- fail on missing input
- emit deterministic diagnostics
- return non-zero exit status on failure

This is the scripting contract.

## 10. Output model

The core API returns the actual validated JavaScript value.

The CLI owns presentation.

### 10.1 Default serialization

Default mode is `auto`:

```txt
string
  print unchanged

non-string
  JSON.stringify(value, null, 2)
```

This should be documented clearly.

### 10.2 Explicit output serializers

Support:

```sh
tp foo --json
tp foo --yaml
```

`--json` serializes the resulting value as JSON.

`--yaml` serializes the resulting value as YAML.

These affect presentation only.

They do not alter template execution.

### 10.3 Output destinations

Support:

```sh
tp foo
tp foo -c
tp foo -o output.txt
tp foo -o output.txt -c
```

Recommended behavior:

```txt
no destination option
  stdout

-c / --clipboard
  clipboard

-o <path>
  file
```

Destinations may compose.

If both stdout and another destination need explicit composition later, introduce an explicit stdout option rather than relying on ambiguous combinations.

### 10.4 No formatter hooks

Templates cannot customize terminal serialization.

There are no template-specific formatter hooks in v1.

If specialized formatting is intrinsic to a use case, the template can return an appropriately shaped value or expose an argument controlling what it generates.

CLI policy remains centralized in the CLI.

## 11. Error model

Define distinct internal error classes:

```txt
RegistryNotFoundError
RegistryLoadError
InvalidRegistryError
TemplateNotFoundError
InputValidationError
TemplateExecutionError
OutputValidationError
SerializationError
OutputWriteError
```

CLI behavior:

- direct/non-interactive invocation: print concise diagnostics and return non-zero
- interactive mode: present the error and return to the nearest useful interaction point where possible

Template-thrown exceptions should be wrapped while preserving:

- original message
- cause
- stack when debug mode is enabled

Provide:

```sh
tp --debug
```

for full exception details.

Normal CLI output should not dump internal stack traces.

## 12. Template tests

Support optional test cases associated with a Template.

Do not make them part of the minimal identity contract.

Recommended API:

```ts
const greet = template({
  name: "Greet",
  description: "Generate a greeting",
  input: z.object({
    name: z.string(),
  }),
  output: z.string(),

  run({ name }) {
    return `Hello ${name}`
  },

  tests: [
    [
      { name: "Ada" },
      "Hello Ada",
    ],
  ],
})
```

The basic tuple means:

```ts
[input, expectedOutput]
```

For v1, equality may use deep strict equality.

Avoid adding matcher DSLs.

Advanced assertions belong in ordinary unit tests.

### 12.1 CLI test command

Support:

```sh
tp test
```

to run all declared template cases.

Support:

```sh
tp test greet
```

to run one template's cases.

The core library should expose the underlying test runner independently of the CLI.

Integration with `node:test` may be provided as a helper, but Tempalace should not require users to adopt a proprietary test framework.

## 13. Grammar architecture

Grammars are adapters from another authoring representation into Template objects.

They are not part of the initial release requirement, but the core should leave an explicit extension seam.

Conceptually:

```ts
interface Grammar {
  readonly name: string

  load(source: GrammarSource): Promise<Template<unknown, unknown>>
}
```

A grammar may:

- read a source file
- compile or parse it
- infer or obtain schemas
- construct a Template
- implement the resulting template's `run`

A grammar may not decide:

- CLI prompting behavior
- CLI argument syntax
- output destination policy
- serialization policy
- clipboard behavior
- global registry policy

Those belong to Tempalace.

### 13.1 Built-in grammar exposure

The core API should eventually allow programs to construct templates using official grammar adapters.

Example future API:

```ts
import { mustache } from "@tempalace/grammar-mustache"

const email = mustache({
  file: "./email.mustache",
  input: z.object({
    name: z.string(),
  }),
})
```

The result is an ordinary Template object.

The registry remains unaware of how it was authored.

## 14. MDX roadmap grammar

MDX is a roadmap feature, not a v1 dependency.

The intended use is document-oriented string generation, not necessarily React application rendering.

The MDX grammar should investigate a mode where:

- Markdown remains the dominant authoring syntax
- JavaScript modules can be imported
- expressions and limited logic are available
- the resulting Template ultimately returns a string

Do not assume that MDX's conventional React output model must dictate Tempalace's runtime output.

The grammar is responsible for adapting MDX semantics into a useful Template.

## 15. Composition

Tempalace does not model composition.

If template A calls template B:

```ts
const result = await templateB.run(input)
```

that is ordinary implementation code.

The registry does not need to know.

The CLI does not need to visualize it.

Tempalace does not build a dependency graph.

Tempalace does not detect template cycles.

Tempalace does not define argument forwarding semantics.

This is explicitly a non-goal.

## 16. Security and future sandboxing

v1 executes trusted project code.

Document this clearly.

Do not describe templates as pure or sandboxed.

However, implement two seams from the beginning:

```txt
RegistryLoader
TemplateExecutor
```

No registry loading or template invocation should bypass these abstractions in core application code.

Future sandboxing work may explore:

- worker threads
- subprocess isolation
- Node permission mechanisms
- alternate runtimes
- restricted module imports
- filesystem permissions
- network permissions
- execution timeouts
- memory limits

Sandboxing must be configurable rather than retroactively redefining the Template abstraction.

## 17. Initial command surface

Target v1:

```sh
tp
tp <id>
tp <id> +name value
tp <id> --input-json ...
tp <id> --input-yaml ...
tp <id> --json
tp <id> --yaml
tp <id> -c
tp <id> -o <file>
tp -r <registry>
tp test
tp test <id>
tp --help
tp --version
```

Also support long-form equivalents for important options.

Do not add subcommands where direct invocation is clearer.

In particular:

```sh
tp greet
```

is preferable to:

```sh
tp run greet
```

## 18. Implementation phases

### Phase 1: core Template kernel

Implement:

- Template types
- `template()` constructor
- generic type inference from Zod
- input validation
- sync/async invocation
- output validation
- invocation errors
- unit tests

Exit criterion:

```ts
const result = await invoke(greet, { name: "Ada" })
```

works with full TypeScript inference and runtime validation.

### Phase 2: registry

Implement:

- TemplateRegistry type
- keyed registry validation
- RegistryLoader interface
- jiti-backed loader
- fixed registry filename discovery
- `-r` override support
- registry error handling

Exit criterion:

Tempalace can load:

```ts
export default {
  greet,
  fixture,
}
```

from `templates.ts`.

### Phase 3: minimal direct CLI

Implement:

```sh
tp greet
tp greet +name Ada
```

including:

- ID lookup
- `+` argument parser
- string-only scalar semantics
- input validation
- execution
- default output serialization
- exit codes

Exit criterion:

A real project can define and invoke useful templates without interactive UI.

### Phase 4: interactive-first UX

Implement:

```sh
tp
```

with:

- searchable template picker
- name/description display
- simple Zod-driven prompts
- defaults
- validation feedback
- retry behavior
- graceful execution-error recovery

This phase validates the product's primary UX.

### Phase 5: structured input

Implement:

- whole-payload JSON
- whole-payload YAML
- stdin payloads
- chosen per-field structured syntax
- comprehensive parsing diagnostics

Before finalizing syntax, prototype the main candidate forms using actual shell examples.

Do not introduce implicit coercion.

### Phase 6: output routing

Implement:

- auto serialization
- JSON serializer
- YAML serializer
- stdout
- clipboard
- files
- composable output destinations
- output errors

### Phase 7: template testing

Implement:

- optional `tests`
- core test-case execution
- deep equality
- `tp test`
- `tp test <id>`
- useful failure diagnostics

### Phase 8: hardening

Implement:

- debug mode
- stable error hierarchy
- registry edge cases
- CommonJS/ESM interoperability
- TypeScript registry coverage
- Windows/macOS/Linux clipboard behavior
- CI
- package publishing
- executable aliases
- performance checks

## 19. Documentation deliverables

Documentation is part of v1, not post-release cleanup.

### 19.1 Root README

Create `README.md` containing:

1. one-paragraph explanation of Tempalace
2. installation
3. five-minute quick start
4. creating `templates.ts`
5. creating a Template
6. running `tp`
7. direct invocation
8. `+` argument syntax
9. JSON/YAML structured input
10. interactive behavior
11. output formats
12. clipboard and file output
13. template testing
14. async templates
15. composition using normal TypeScript
16. trusted-code/security model
17. registry filename and `-r`
18. API usage
19. concise architecture explanation
20. link to roadmap

The README should include a complete minimal example:

```ts
import { template } from "@tempalace/core"
import { z } from "zod"

const greet = template({
  name: "Greet",
  description: "Generate a greeting",
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

followed by:

```sh
tp
```

and:

```sh
tp greet +name Ada
```

### 19.2 Architecture documentation

Create:

```txt
docs/architecture.md
```

covering:

- Template abstraction
- registries
- registry loading
- executor abstraction
- trusted-code model
- CLI/API boundary
- explicit non-goals
- grammar architecture
- why Tempalace does not define composition syntax

### 19.3 CLI documentation

Create:

```txt
docs/cli.md
```

with exhaustive command and option reference plus shell examples.

### 19.4 API documentation

Create:

```txt
docs/api.md
```

covering:

- Template
- `template()`
- invocation
- registry types
- test API
- extension interfaces

## 20. Roadmap

Create `ROADMAP.md`.

It should distinguish committed near-term work from exploratory ideas.

Suggested structure:

### v1

- Template core
- Zod schemas
- keyed TypeScript/JavaScript registry
- `templates.*` discovery
- interactive CLI
- `+` scalar arguments
- explicit JSON/YAML structured input
- async execution
- output validation
- auto/JSON/YAML serialization
- clipboard and file output
- template test cases
- trusted in-process execution

### Near-term

- improved support for complex Zod interactive prompts
- sensitive/secret input metadata or schema annotation
- richer registry inspection
- shell completion
- first official grammar package
- performance profiling for large registries
- better test-case ergonomics

### Grammar ecosystem

Investigate:

- Mustache grammar
- MDX grammar
- Handlebars or other existing template engines where justified

Do not implement a Tempalace-specific grammar.

### Execution isolation

Explore optional:

- worker execution
- subprocess execution
- configurable sandboxing
- filesystem/network restrictions
- execution timeout
- cancellation

### Distribution

Explore:

- publishing reusable template registries as npm packages
- importing registries from packages
- registry composition in ordinary TypeScript
- package conventions for reusable Tempalace libraries

### Explicit non-roadmap

Unless concrete needs emerge, do not pursue:

- custom template syntax
- custom expression language
- template pipeline DSL
- graphical dependency graphs
- implicit CLI type coercion
- dynamic upward registry search
- arbitrary metadata proliferation
- mandatory protocol version fields
- framework-specific output semantics in core

## 21. Acceptance criteria for v1

Tempalace v1 is successful when a developer can:

1. install it
2. create `templates.ts`
3. expose a few typed functions
4. run `tp`
5. search/select one interactively
6. receive schema-driven prompts
7. execute it
8. copy or save the result
9. directly invoke the same template using shell arguments
10. provide explicit JSON/YAML for structured values
11. consume the same Template objects programmatically
12. compose templates freely in ordinary TypeScript
13. test templates with ordinary tests or registry-provided cases

without learning:

- a new programming language
- a Tempalace composition syntax
- a custom schema system
- a project configuration format
- a build step

That is the central product test.

## 22. Guiding implementation rule

When a feature request can be solved naturally in ordinary JavaScript or TypeScript, prefer documenting that solution over adding syntax to Tempalace.

Tempalace should provide the interface between reusable functions and humans at the terminal.

It should not become another programming language.
