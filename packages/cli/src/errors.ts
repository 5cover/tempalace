import { InputValidationError, TempalaceError } from '@tempalace/core'

export function formatError(error: unknown, debug: boolean): string {
  if (debug && error instanceof Error && error.stack !== undefined) {
    return error.stack
  }

  if (error instanceof InputValidationError && error.issues.length > 0) {
    return `${error.message}\n${error.issues.map(issue => `  ${issue}`).join('\n')}`
  }
  if (error instanceof TempalaceError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred.'
}
