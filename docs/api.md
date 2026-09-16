# API reference

## `Template<I, O>`

```ts
type Template<I, O> = InputlessTemplate<O> | ParameterizedTemplate<I, O>

interface ParameterizedTemplate<I, O> {
  readonly name: string
  readonly description?: string
  readonly input: ZodType<I>
  readonly output: ZodType<O>
  readonly run: (input: I) => O | Promise<O>
  readonly tests?: readonly TemplateTestCase<I, O>[]
}
```

`InputlessTemplate<O>` has no `input` property and has `run(): O | Promise<O>`. Use `template()` rather than manually creating either variant. It preserves schema inference for `run`.

## `template()`

```ts
const greeting = template({
  name: "Greeting",
  input: z.object({ name: z.string() }),
  output: z.string(),
  run: ({ name }) => `Hello ${name}`,
})

const version = template({
  name: "Version",
  output: z.string(),
  run: () => "1.0.0",
})
```

Omit `input` for a template with no input. The callback may return a value or a promise. `TemplateDefinition<OutputSchema>` describes this input-less form; `ParameterizedTemplateDefinition<InputSchema, OutputSchema>` adds the input schema, parameterized callback, and parameterized test cases.

## `invoke()`

```ts
const result = await invoke(greeting, { name: "Ada" })
const currentVersion = await invoke(version)
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

`TemplateTestCase<I, O>` is a readonly `[input, expectedOutput]` tuple. Input-less template cases use `undefined` for input, for example `[undefined, "1.0.0"]`. `runTemplateTests(template)` executes declared cases with deep strict equality and returns a result containing `passed` and `failures`. It does not require a particular test framework; ordinary `node:test` remains appropriate for advanced assertions.

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
