# Architecture

## Template abstraction

A `Template<I, O>` holds a human-facing `name`, optional `description`, Zod `input` and `output` schemas, and `run(input)`. The `template()` constructor connects schema inference to `run` so TypeScript detects mismatches. `invoke()` always validates input, awaits synchronous or asynchronous functions uniformly, and validates output unless explicitly disabled.

The result returned by core is the validated JavaScript value. Rendering is exclusively a CLI concern.

## Registries and loading

A registry is the default export of a JavaScript or TypeScript module, keyed by stable CLI IDs. The core validates the export shape and each template runtime shape. The CLI discovers fixed `templates.*` names only in the current directory, or accepts `--registry`.

`RegistryLoader` is the loading seam. `JitiRegistryLoader` is the v1 implementation and supports the normal JS, TS, CommonJS, and ESM registry formats. No application code reaches directly into jiti outside that loader.

## Execution

`TemplateExecutor` is the execution seam. `InProcessTemplateExecutor` delegates to `invoke()` today. Worker, subprocess, and sandbox implementations can later implement the same interface without changing the public `Template` contract.

## Trusted code

Tempalace v1 executes registry modules and templates in-process. It is intended for trusted developer projects, similarly to build configuration and tests. It is not a sandbox and makes no purity, timeout, filesystem, or network guarantees.

## API and CLI boundary

The TypeScript API is the complete programming model. Templates compose through ordinary imports and function calls. The CLI supplies discovery, prompting, explicit input parsing, validation, execution, output serialization, clipboard and file routing, and an automation-friendly direct mode.

CLI scalar values remain strings. JSON and YAML parsing only occurs where the user explicitly requests it. This avoids hidden coercion and preserves an author-controlled schema boundary.

## Non-goals

Tempalace does not define pipelines, selectors, dataflow, partials, inheritance, a custom expression language, composition syntax, dependency graphs, implicit coercion, or upward registry search. When a workflow needs richer composition, write TypeScript.

## Grammar extension seam

`Grammar` adapts another source representation into a normal `Template`. A grammar receives a `GrammarSource` and returns a template. Grammars may parse or compile source, but they do not control CLI prompts, CLI arguments, output serialization, clipboard behavior, or registry policy. Mustache and MDX adapters are future packages, not core dependencies.
