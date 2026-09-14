# API reference

## `Template<I, O>`

```ts
interface Template<I, O> {
  readonly name: string
  readonly description?: string
  readonly input: ZodType<I>
  readonly output: ZodType<O>
  readonly run: (input: I) => O | Promise<O>
  readonly tests?: readonly TemplateTestCase<I, O>[]
}
```

Use `template()` rather than manually creating a template. It preserves schema inference for `run`.

## `template()`

```ts
const greeting = template({
  name: "Greeting",
  input: z.object({ name: z.string() }),
  output: z.string(),
  run: ({ name }) => `Hello ${name}`,
})
```

The callback may return a value or a promise.

## `invoke()`

```ts
const result = await invoke(greeting, { name: "Ada" })
```

It parses raw input, calls and awaits `run`, parses the output, then returns the validated output. Input validation cannot be skipped. To skip only output validation, use `invoke(template, input, { validateOutput: false })`.

Errors include `InputValidationError`, `TemplateExecutionError`, and `OutputValidationError`. Registry and output related errors are also exported from `@tempalace/core`.

## Registries

```ts
type TemplateRegistry = Readonly<Record<string, Template<unknown, unknown>>>

interface RegistryLoader {
  load(path: string): Promise<TemplateRegistry>
}
```

`validateRegistry(value)` validates a default export. `JitiRegistryLoader` is the standard runtime loader.

## Test cases

`TemplateTestCase<I, O>` is a readonly `[input, expectedOutput]` tuple. `runTemplateTests(template)` executes declared cases with deep strict equality and returns a result containing `passed` and `failures`. It does not require a particular test framework; ordinary `node:test` remains appropriate for advanced assertions.

## Extension interfaces

```ts
interface TemplateExecutor {
  execute(template: Template<unknown, unknown>, input: unknown, options?: InvocationOptions): Promise<unknown>
}

interface Grammar {
  readonly name: string
  load(source: GrammarSource): Promise<Template<unknown, unknown>>
}
```

`InProcessTemplateExecutor` is the default executor. Grammar packages should construct normal templates and leave terminal policy to the CLI.
