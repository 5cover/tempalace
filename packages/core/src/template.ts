import * as z from 'zod'

export interface Template<I, O> {
  readonly name: string
  readonly description?: string
  readonly input: z.ZodType<I>
  readonly output: z.ZodType<O>
  readonly run: (input: I) => O | Promise<O>
  readonly tests?: readonly TemplateTestCase<I, O>[]
}

export type TemplateTestCase<I, O> = readonly [input: I, expectedOutput: O]

export interface TemplateDefinition<InputSchema extends z.ZodType, OutputSchema extends z.ZodType> {
  readonly name: string
  readonly description?: string
  readonly input: InputSchema
  readonly output: OutputSchema
  readonly run: (input: z.infer<InputSchema>) => z.infer<OutputSchema> | Promise<z.infer<OutputSchema>>
  readonly tests?: readonly TemplateTestCase<z.infer<InputSchema>, z.infer<OutputSchema>>[]
}

export function template<InputSchema extends z.ZodType, OutputSchema extends z.ZodType>(
  definition: TemplateDefinition<InputSchema, OutputSchema>
): Template<z.infer<InputSchema>, z.infer<OutputSchema>> {
  // The generic Zod declaration cannot express that an arbitrary schema's
  // output is the input accepted by its associated callback. The definition
  // type enforces that relationship at the constructor boundary.
  return { ...definition } as Template<z.infer<InputSchema>, z.infer<OutputSchema>>
}
