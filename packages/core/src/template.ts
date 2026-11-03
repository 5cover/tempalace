import { zod as z } from './index.js'

interface TemplateMetadata<OutputSchema extends z.ZodType> {
  readonly name: string
  readonly description?: string
  readonly output: OutputSchema
}

export type TemplateTestCase<I, O> = readonly [input: I, expectedOutput: O]

export interface TemplateDefinition<OutputSchema extends z.ZodType> extends TemplateMetadata<OutputSchema> {
  readonly run: () => z.input<OutputSchema> | Promise<z.input<OutputSchema>>
  readonly tests?: readonly TemplateTestCase<undefined, z.output<OutputSchema>>[]
}

export type ParameterizedTemplateDefinition<InputSchema extends z.ZodType, OutputSchema extends z.ZodType> = Omit<
  TemplateDefinition<OutputSchema>,
  'run' | 'tests'
> & {
  readonly input: InputSchema
  readonly run: (input: z.output<InputSchema>) => z.input<OutputSchema> | Promise<z.input<OutputSchema>>
  readonly tests?: readonly TemplateTestCase<z.input<InputSchema>, z.output<OutputSchema>>[]
}

export type InputlessTemplate<OutputSchema extends z.ZodType> = TemplateDefinition<OutputSchema>

export type ParameterizedTemplate<
  InputSchema extends z.ZodType,
  OutputSchema extends z.ZodType,
> = ParameterizedTemplateDefinition<InputSchema, OutputSchema>

// Schema-agnostic form for registries and executors. zod's unknown default would reject specific templates.
type AnySchema = z.ZodType<any, any>

export type Template = InputlessTemplate<AnySchema> | ParameterizedTemplate<AnySchema, AnySchema>

export function isParameterizedTemplate(
  currentTemplate: Template
): currentTemplate is ParameterizedTemplate<AnySchema, AnySchema> {
  return 'input' in currentTemplate
}

export function template<InputSchema extends z.ZodType, OutputSchema extends z.ZodType>(
  definition: ParameterizedTemplateDefinition<InputSchema, OutputSchema>
): ParameterizedTemplate<InputSchema, OutputSchema>
export function template<OutputSchema extends z.ZodType>(
  definition: TemplateDefinition<OutputSchema>
): InputlessTemplate<OutputSchema>
export function template(definition: Template): Template {
  return definition
}
