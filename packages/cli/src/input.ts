import { parse as parseYaml } from 'yaml'
import { InputValidationError } from '@tempalace/core'

export type StructuredFormat = 'json' | 'yaml'

export interface ParsedTemplateArguments {
  readonly argv: readonly string[]
  readonly fields: Readonly<Record<string, unknown>>
}

export interface InvocationInputOptions {
  readonly input?: string
  readonly inputJson?: string
  readonly inputYaml?: string
}

function parseStructuredValue(value: string, format: StructuredFormat): unknown {
  try {
    return format === 'json' ? JSON.parse(value) : parseYaml(value)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid structured input.'
    throw new InputValidationError(`Could not parse ${format.toUpperCase()} input: ${message}`, [])
  }
}

export async function readStructuredInput(value: string, format: StructuredFormat): Promise<unknown> {
  const source = value === '-' ? await readStandardInput() : value
  return parseStructuredValue(source, format)
}

export async function resolveInvocationInput(
  options: InvocationInputOptions,
  fields: Readonly<Record<string, unknown>>
): Promise<unknown> {
  const sources = [options.input, options.inputJson, options.inputYaml].filter(
    (source): source is string => source !== undefined
  )
  if (sources.length > 1) {
    throw new InputValidationError('Use only one of --input, --input-json, or --input-yaml.', [])
  }

  if (options.input !== undefined) {
    if (Object.keys(fields).length > 0) {
      throw new InputValidationError('--input cannot be combined with + arguments.', [])
    }
    return options.input
  }

  const hasStructuredInput = options.inputJson !== undefined || options.inputYaml !== undefined
  const structuredInput =
    options.inputJson !== undefined
      ? await readStructuredInput(options.inputJson, 'json')
      : options.inputYaml !== undefined
        ? await readStructuredInput(options.inputYaml, 'yaml')
        : undefined

  if (!hasStructuredInput) {
    return fields
  }
  if (Object.keys(fields).length === 0) {
    return structuredInput
  }
  if (!isObjectRecord(structuredInput)) {
    throw new InputValidationError(
      '+ arguments can only be combined with an object supplied through --input-json or --input-yaml.',
      []
    )
  }

  for (const key of Object.keys(fields)) {
    if (Object.hasOwn(structuredInput, key)) {
      throw new InputValidationError(`Input '${key}' was provided both as structured input and a + argument.`, [])
    }
  }
  return { ...structuredInput, ...fields }
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

async function readStandardInput(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
  }
  return Buffer.concat(chunks).toString('utf8')
}

export function parseTemplateArguments(argv: readonly string[]): ParsedTemplateArguments {
  const fields: Record<string, unknown> = {}
  const remaining: string[] = []

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === undefined) {
      continue
    }
    if (!token.startsWith('+')) {
      remaining.push(token)
      continue
    }

    const match = /^\+([A-Za-z][A-Za-z0-9_-]*)(?::(json|yaml))?$/.exec(token)
    if (match === null) {
      throw new InputValidationError(`Invalid template argument '${token}'.`, [])
    }
    const key = match[1]
    if (key === undefined) {
      throw new InputValidationError(`Invalid template argument '${token}'.`, [])
    }
    const suffix = match[2]
    const format: StructuredFormat | undefined = suffix === 'json' || suffix === 'yaml' ? suffix : undefined
    const value = argv[index + 1]
    if (value === undefined) {
      throw new InputValidationError(`Missing value for '${token}'.`, [])
    }
    if (Object.hasOwn(fields, key)) {
      throw new InputValidationError(`Input '${key}' was provided more than once.`, [])
    }
    fields[key] = format === undefined ? value : parseStructuredValue(value, format)
    index += 1
  }

  return { argv: remaining, fields }
}
