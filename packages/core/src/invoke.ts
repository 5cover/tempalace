import { InputValidationError, OutputValidationError, TemplateExecutionError } from './errors.js'
import type { zod as z } from './index.js'
import {
  isParameterizedTemplate,
  type InputlessTemplate,
  type ParameterizedTemplate,
  type Template,
} from './template.js'

export interface InvocationOptions {
  readonly validateOutput?: boolean
}

function formatIssues(
  issues: readonly {
    readonly path: readonly PropertyKey[]
    readonly message: string
  }[]
): string[] {
  return issues.map(issue => {
    const path = issue.path.length === 0 ? 'input' : issue.path.join('.')
    return `${path}: ${issue.message}`
  })
}

export function invoke<OutputSchema extends z.ZodType>(
  currentTemplate: InputlessTemplate<OutputSchema>,
  options?: InvocationOptions
): Promise<z.output<OutputSchema>>
export function invoke<InputSchema extends z.ZodType, OutputSchema extends z.ZodType>(
  currentTemplate: ParameterizedTemplate<InputSchema, OutputSchema>,
  rawInput: z.input<InputSchema>,
  options?: InvocationOptions
): Promise<z.output<OutputSchema>>
export function invoke(currentTemplate: Template, rawInput?: unknown, options?: InvocationOptions): Promise<unknown> {
  return invokeTemplate(currentTemplate, rawInput, options)
}

// Untyped entry point for callers that hold a Template of unknown schema types, such as registries and executors.
export async function invokeTemplate(
  currentTemplate: Template,
  rawInput?: unknown,
  options?: InvocationOptions
): Promise<unknown> {
  const invocationOptions =
    !isParameterizedTemplate(currentTemplate) && options === undefined && isInvocationOptions(rawInput)
      ? rawInput
      : (options ?? {})

  let result: unknown
  try {
    if (isParameterizedTemplate(currentTemplate)) {
      const parsedInput = currentTemplate.input.safeParse(rawInput)
      if (!parsedInput.success) {
        const issues = formatIssues(parsedInput.error.issues)
        throw new InputValidationError('Template input is invalid.', issues, {
          cause: parsedInput.error,
        })
      }
      result = await Promise.resolve(currentTemplate.run(parsedInput.data))
    } else {
      result = await Promise.resolve(currentTemplate.run())
    }
  } catch (error: unknown) {
    if (error instanceof InputValidationError) {
      throw error
    }
    const message = error instanceof Error ? error.message : 'Template execution failed.'
    throw new TemplateExecutionError(message, { cause: error })
  }

  if (invocationOptions.validateOutput === false) {
    return result
  }

  const parsedOutput = currentTemplate.output.safeParse(result)
  if (!parsedOutput.success) {
    const issues = formatIssues(parsedOutput.error.issues)
    throw new OutputValidationError('Template output is invalid.', issues, {
      cause: parsedOutput.error,
    })
  }

  return parsedOutput.data
}

function isInvocationOptions(value: unknown): value is InvocationOptions {
  return value !== null && typeof value === 'object' && 'validateOutput' in value
}
