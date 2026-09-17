import { InvalidRegistryError } from './errors.js'
import type { Template } from './template.js'

export type TemplateRegistry = Readonly<Record<string, Template<unknown, unknown>>>

export interface RegistryLoader {
  load(path: string): Promise<TemplateRegistry>
}

function isTemplate(value: unknown): value is Template<unknown, unknown> {
  if (!isRecord(value)) {
    return false
  }

  const hasValidInput = value.input === undefined || (value.input !== null && typeof value.input === 'object')

  return (
    typeof value.name === 'string' &&
    (value.description === undefined || typeof value.description === 'string') &&
    typeof value.run === 'function' &&
    hasValidInput &&
    value.output !== null &&
    typeof value.output === 'object'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function validateRegistry(value: unknown): TemplateRegistry {
  if (!isRecord(value)) {
    throw new InvalidRegistryError('Registry default export must be an object keyed by template ID.')
  }

  const registry: Record<string, Template<unknown, unknown>> = {}
  for (const [id, currentTemplate] of Object.entries(value)) {
    if (id.length === 0) {
      throw new InvalidRegistryError('Registry template IDs cannot be empty.')
    }
    if (!isTemplate(currentTemplate)) {
      throw new InvalidRegistryError(`Registry entry '${id}' is not a valid Template.`)
    }
    registry[id] = currentTemplate
  }

  return registry
}
