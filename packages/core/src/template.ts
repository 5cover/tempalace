import { zod as z } from './index.js'

interface TemplateMetadata<OutputSchema extends z.ZodType> {
  readonly name: string
  readonly description?: string
  readonly output: OutputSchema
}

export type TemplateTestCase<I, O> = readonly [input: I, expectedOutput: O]

export interface TemplateDefinition<OutputSchema extends z.ZodType> extends TemplateMetadata<OutputSchema> {
  readonly run: () => z.input<OutputSchema> | Promise<z.input<OutputSchema>>
  readonly tests?: readonly TemplateTestCase<undefined, z.input<OutputSchema>>[]
}

export type ParameterizedTemplateDefinition<InputSchema extends z.ZodType, OutputSchema extends z.ZodType> = Omit<
  TemplateDefinition<OutputSchema>,
  'run' | 'tests'
> & {
  readonly input: InputSchema
  readonly run: (input: z.output<InputSchema>) => z.input<OutputSchema> | Promise<z.input<OutputSchema>>
  readonly tests?: readonly TemplateTestCase<z.output<InputSchema>, z.input<OutputSchema>>[]
}

export interface InputlessTemplate<O> {
  readonly name: string
  readonly description?: string
  readonly output: z.ZodType<O, O>
  readonly run: () => O | Promise<O>
  readonly tests?: readonly TemplateTestCase<undefined, O>[]
}

export interface ParameterizedTemplate<I, O> {
  readonly name: string
  readonly description?: string
  readonly input: z.ZodType<I, I>
  readonly output: z.ZodType<O, O>
  readonly run: (input: I) => O | Promise<O>
  readonly tests?: readonly TemplateTestCase<I, O>[]
}

export type Template<I, O> = InputlessTemplate<O> | ParameterizedTemplate<I, O>

export function isParameterizedTemplate<I, O>(
  currentTemplate: Template<I, O>
): currentTemplate is ParameterizedTemplate<I, O> {
  return 'input' in currentTemplate
}

export function template<InputSchema extends z.ZodType, OutputSchema extends z.ZodType>(
  definition: ParameterizedTemplateDefinition<InputSchema, OutputSchema>
): ParameterizedTemplate<z.output<InputSchema>, z.input<OutputSchema>>
export function template<OutputSchema extends z.ZodType>(
  definition: TemplateDefinition<OutputSchema>
): InputlessTemplate<z.input<OutputSchema>>
export function template(
  definition: TemplateDefinition<z.ZodType> | ParameterizedTemplateDefinition<z.ZodType, z.ZodType>
): Template<unknown, unknown> {
  return definition
}
