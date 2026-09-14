# Roadmap

## v1

- Typed Template core with Zod input and output validation
- Keyed JavaScript and TypeScript registries
- Fixed `templates.*` discovery and explicit registry override
- Interactive selector and schema-guided input collection
- `+` scalar inputs and explicit JSON/YAML structured input
- Async execution and output validation
- Auto, JSON, and YAML output serialization
- Clipboard and file destinations
- Declared template test cases and `tp test`
- Trusted in-process loading and execution

## Near-term

- Better interactive support for complex Zod shapes
- Sensitive input annotations
- Registry inspection commands
- Shell completion
- First official grammar package
- Large-registry performance profiling
- Improved test-case diagnostics

## Grammar ecosystem

Investigate Mustache, MDX, Handlebars, and other established authoring formats when they can adapt into ordinary templates. Do not create a Tempalace-specific grammar.

## Execution isolation

Explore optional worker execution, subprocess execution, configurable sandboxing, filesystem and network restrictions, timeouts, cancellation, and memory limits.

## Distribution

Explore reusable registry packages, package-based registry imports, registry composition in ordinary TypeScript, and conventions for sharing template libraries.

## Explicit non-roadmap

Unless concrete needs emerge, do not add a custom template syntax, expression language, pipeline DSL, graphical dependency graph, implicit CLI coercion, dynamic upward registry search, arbitrary metadata, mandatory protocol versions, or framework-specific output semantics in core.
