import { SerializationError } from '@tempalace/core'
import { stringify as stringifyYaml } from 'yaml'

export type OutputFormat = 'auto' | 'json' | 'yaml'

export function serializeOutput(value: unknown, format: OutputFormat): string {
  try {
    if (format === 'json') {
      const output = JSON.stringify(value, null, 2)
      if (output === undefined) {
        throw new SerializationError('Output cannot be represented as JSON.')
      }
      return `${output}\n`
    }
    if (format === 'yaml') {
      return stringifyYaml(value)
    }
    if (typeof value === 'string') {
      return `${value}\n`
    }
    const output = JSON.stringify(value, null, 2)
    if (output === undefined) {
      throw new SerializationError('Output cannot be represented as JSON.')
    }
    return `${output}\n`
  } catch (error: unknown) {
    if (error instanceof SerializationError) {
      throw error
    }
    const message = error instanceof Error ? error.message : 'Unable to serialize output.'
    throw new SerializationError(message, { cause: error })
  }
}
