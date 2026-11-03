# API reference

## `Template`

```ts
type Template = InputlessTemplate<ZodType<any, any>> | ParameterizedTemplate<ZodType<any, any>, ZodType<any, any>>

interface ParameterizedTemplate<InputSchema extends ZodType, OutputSchema extends ZodType> {
  readonly name: string
  readonly description?: string
  readonly input: InputSchema
  readonly output: OutputSchema
  run(
    this: ParameterizedTemplate<InputSchema, OutputSchema>,
    input: z.output<InputSchema>
  ): z.input<OutputSchema> | Promise<z.input<OutputSchema>>
  readonly tests?: readonly TemplateTestCase<z.input<InputSchema>, z.output<OutputSchema>>[]
}
```

`run` is declared as a method, so `this` is the template being run. Define it with method syntax (`run(input) { ... }`) to use `this`, for example `this.input` or recursive `this.run(...)`. Arrow functions cannot read `this`, but they are still accepted for `run`. Call `run` as a method (`greet.run(x)`) or through `invoke`. A detached reference such as `const { run } = greet` is a compile error.

`run` receives the parsed input (`z.output` of the input schema). It returns the value before output parsing (`z.input` of the output schema), which the output schema then parses.

`InputlessTemplate<OutputSchema>` has no `input` property and has `run(this: InputlessTemplate<OutputSchema>): z.input<OutputSchema> | Promise<z.input<OutputSchema>>`. Use `template()` rather than manually creating either variant. It returns its argument unchanged and exists for schema inference.

## `template()`

```ts
const greeting = template({
  name: 'Greeting',
  input: z.object({ name: z.string() }),
  output: z.string(),
  run: ({ name }) => `Hello ${name}`,
})

const version = template({
  name: 'Version',
  output: z.string(),
  run: () => '1.0.0',
})
```

Omit `input` for a template with no input. The callback may return a value or a promise. `TemplateDefinition<OutputSchema>` describes this input-less form; `ParameterizedTemplateDefinition<InputSchema, OutputSchema>` adds the input schema, parameterized callback, and parameterized test cases.

## `invoke()`

```ts
const result = await invoke(greeting, { name: 'Ada' })
const currentVersion = await invoke(version)
```

The raw input is typed as `z.input` of the input schema, so TypeScript checks it before any transform runs. `invoke` parses it, calls and awaits `run`, parses the output, and returns the validated value typed as `z.output` of the output schema. Input validation cannot be skipped. To skip only output validation, use `invoke(template, input, { validateOutput: false })`.

`invokeTemplate(template, rawInput, options)` accepts any `Template` with an `unknown` raw input. Registries, executors, and the CLI use it because they do not know the schema types.

Errors include `InputValidationError`, `TemplateExecutionError`, and `OutputValidationError`. Registry and output related errors are also exported from `@tempalace/core`.

## Registries

```ts
type TemplateRegistry = Readonly<Record<string, Template>>

interface RegistryLoader {
  load(path: string): Promise<TemplateRegistry>
}
```

`validateRegistry(value)` validates a default export. `JitiRegistryLoader` is the standard runtime loader.

## Test cases

`TemplateTestCase<I, O>` is a readonly `[input, expectedOutput]` tuple. Case inputs are raw values (`z.input`) passed to `invoke`, and expected outputs are compared with the validated result (`z.output`). Input-less template cases use `undefined` for input, for example `[undefined, "1.0.0"]`. `runTemplateTests(template)` executes declared cases with deep strict equality and returns a result containing `passed` and `failures`. It does not require a particular test framework; ordinary `node:test` remains appropriate for advanced assertions.

## Extension interfaces

```ts
interface TemplateExecutor {
  execute(template: Template, input: unknown, options?: InvocationOptions): Promise<unknown>
}

interface Grammar {
  readonly name: string
  load(source: GrammarSource): Promise<Template>
}
```

`InProcessTemplateExecutor` is the default executor. Grammar packages should construct normal templates and leave terminal policy to the CLI.
