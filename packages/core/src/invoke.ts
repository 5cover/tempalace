import { InputValidationError, OutputValidationError, TemplateExecutionError } from './errors.js'
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

export function invoke<O>(currentTemplate: InputlessTemplate<O>, options?: InvocationOptions): Promise<O>
export function invoke<I, O>(
  currentTemplate: ParameterizedTemplate<I, O>,
  rawInput: unknown,
  options?: InvocationOptions
): Promise<O>
export function invoke<I, O>(
  currentTemplate: Template<I, O>,
  rawInput?: unknown,
  options?: InvocationOptions
): Promise<O>
export async function invoke<I, O>(
  currentTemplate: Template<I, O>,
  rawInput?: unknown,
  options?: InvocationOptions
): Promise<O> {
  const invocationOptions =
    !isParameterizedTemplate(currentTemplate) && options === undefined && isInvocationOptions(rawInput)
      ? rawInput
      : (options ?? {})

  let result: O
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
