import { InputValidationError, OutputValidationError, TemplateExecutionError } from "./errors.js"
import type { Template } from "./template.js"

export interface InvocationOptions {
  readonly validateOutput?: boolean
}

function formatIssues(issues: readonly { readonly path: readonly PropertyKey[]; readonly message: string }[]): string[] {
  return issues.map((issue) => {
    const path = issue.path.length === 0 ? "input" : issue.path.join(".")
    return `${path}: ${issue.message}`
  })
}

export async function invoke<I, O>(
  currentTemplate: Template<I, O>,
  rawInput: unknown,
  options: InvocationOptions = {},
): Promise<O> {
  const parsedInput = currentTemplate.input.safeParse(rawInput)
  if (!parsedInput.success) {
    const issues = formatIssues(parsedInput.error.issues)
    throw new InputValidationError("Template input is invalid.", issues, { cause: parsedInput.error })
  }

  let result: O
  try {
    result = await Promise.resolve(currentTemplate.run(parsedInput.data))
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Template execution failed."
    throw new TemplateExecutionError(message, { cause: error })
  }

  if (options.validateOutput === false) {
    return result
  }

  const parsedOutput = currentTemplate.output.safeParse(result)
  if (!parsedOutput.success) {
    const issues = formatIssues(parsedOutput.error.issues)
    throw new OutputValidationError("Template output is invalid.", issues, { cause: parsedOutput.error })
  }

  return parsedOutput.data
}
