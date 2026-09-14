import type { ZodType, output } from "zod"

export interface Template<I, O> {
  readonly name: string
  readonly description?: string
  readonly input: ZodType<I>
  readonly output: ZodType<O>
  readonly run: (input: I) => O | Promise<O>
  readonly tests?: readonly TemplateTestCase<I, O>[]
}

export type TemplateTestCase<I, O> = readonly [input: I, expectedOutput: O]

export interface TemplateDefinition<InputSchema extends ZodType, OutputSchema extends ZodType> {
  readonly name: string
  readonly description?: string
  readonly input: InputSchema
  readonly output: OutputSchema
  readonly run: (input: output<InputSchema>) => output<OutputSchema> | Promise<output<OutputSchema>>
  readonly tests?: readonly TemplateTestCase<output<InputSchema>, output<OutputSchema>>[]
}

export function template<InputSchema extends ZodType, OutputSchema extends ZodType>(
  definition: TemplateDefinition<InputSchema, OutputSchema>,
): Template<output<InputSchema>, output<OutputSchema>> {
  // The generic Zod declaration cannot express that an arbitrary schema's
  // output is the input accepted by its associated callback. The definition
  // type enforces that relationship at the constructor boundary.
  return definition as Template<output<InputSchema>, output<OutputSchema>>
}
