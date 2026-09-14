import { parse as parseYaml } from "yaml"
import { InputValidationError } from "@tempalace/core"

export type StructuredFormat = "json" | "yaml"

export interface ParsedTemplateArguments {
  readonly argv: readonly string[]
  readonly fields: Readonly<Record<string, unknown>>
}

function parseStructuredValue(value: string, format: StructuredFormat): unknown {
  try {
    return format === "json" ? JSON.parse(value) : parseYaml(value)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Invalid structured input."
    throw new InputValidationError(`Could not parse ${format.toUpperCase()} input: ${message}`, [])
  }
}

export async function readStructuredInput(value: string, format: StructuredFormat): Promise<unknown> {
  const source = value === "-" ? await readStandardInput() : value
  return parseStructuredValue(source, format)
}

async function readStandardInput(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
  }
  return Buffer.concat(chunks).toString("utf8")
}

export function parseTemplateArguments(argv: readonly string[]): ParsedTemplateArguments {
  const fields: Record<string, unknown> = {}
  const remaining: string[] = []

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === undefined) {
      continue
    }
    if (!token.startsWith("+")) {
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
    const format: StructuredFormat | undefined = suffix === "json" || suffix === "yaml" ? suffix : undefined
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
