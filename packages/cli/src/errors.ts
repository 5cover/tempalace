import { InputValidationError, TempalaceError } from '@tempalace/core'

export function formatError(error: unknown, debug: boolean): string {
  if (debug && error instanceof Error) {
    let s = `${error.name}: ${error.message}`
    if (error.stack) s += `\nstack: ${error.stack}`
    if (error.cause) s += `\ncaused by: ${formatError(error.cause, debug)}`
    return s
  }
  if (error instanceof InputValidationError && error.issues.length > 0) {
    return `${error.message}\n${error.issues.map(issue => `  ${issue}`).join('\n')}`
  }
  if (error instanceof Error) {
    return error.message
  }
  return debug ? String(error) : 'An unexpected error occurred.'
}
