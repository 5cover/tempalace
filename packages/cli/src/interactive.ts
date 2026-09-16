import { input, select } from "@inquirer/prompts"
import search from "@inquirer/search"
import {
  InProcessTemplateExecutor,
  InputValidationError,
  TemplateExecutionError,
  isParameterizedTemplate,
  type Template,
  type TemplateRegistry,
} from "@tempalace/core"
import { z } from "zod"
import { formatError } from "./errors.js"
import { readStructuredInput, type StructuredFormat } from "./input.js"
import { writeOutput } from "./output.js"
import { serializeOutput } from "./serialization.js"

interface FieldDetails {
  readonly schema: z.core.$ZodType
  readonly optional: boolean
  readonly defaultValue?: string
}

interface SafeParser {
  safeParse(value: unknown): { readonly success: true; readonly data: unknown } | { readonly success: false }
}

function isSafeParser(value: unknown): value is SafeParser {
  return value !== null
    && typeof value === "object"
    && "safeParse" in value
    && typeof value.safeParse === "function"
}

function isOptionalSchema(schema: z.core.$ZodType): schema is z.core.$ZodOptional {
  return schema._zod.def.type === "optional"
}

function isDefaultSchema(schema: z.core.$ZodType): schema is z.core.$ZodDefault {
  return schema._zod.def.type === "default"
}

function isStringSchema(schema: z.core.$ZodType): schema is z.core.$ZodString {
  return schema._zod.def.type === "string"
}

function isEnumSchema(schema: z.core.$ZodType): schema is z.core.$ZodEnum {
  return schema._zod.def.type === "enum"
}

function getFieldDetails(schema: z.core.$ZodType): FieldDetails {
  let defaultValue: string | undefined
  let hasDefault = false
  if (isSafeParser(schema)) {
    const defaultResult = schema.safeParse(undefined)
    hasDefault = defaultResult.success
    if (defaultResult.success && typeof defaultResult.data === "string") {
      defaultValue = defaultResult.data
    }
  }
  let innerSchema = schema
  let optional = hasDefault

  while (isOptionalSchema(innerSchema) || isDefaultSchema(innerSchema)) {
    optional = true
    innerSchema = innerSchema._zod.def.innerType
  }

  return { schema: innerSchema, optional, ...(defaultValue === undefined ? {} : { defaultValue }) }
}

async function collectStructuredField(fieldName: string): Promise<unknown> {
  const format = await select<StructuredFormat>({
    message: `${fieldName}: choose an explicit structured format`,
    choices: [
      { name: "JSON", value: "json" },
      { name: "YAML", value: "yaml" },
    ],
  })
  const source = await input({ message: `${fieldName}: ${format.toUpperCase()} value` })
  return readStructuredInput(source, format)
}

async function collectObjectInput(currentTemplate: Template<unknown, unknown>): Promise<unknown> {
  if (!isParameterizedTemplate(currentTemplate)) {
    return undefined
  }

  if (!(currentTemplate.input instanceof z.ZodObject)) {
    return collectStructuredField("input")
  }

  const values: Record<string, unknown> = {}
  for (const [fieldName, fieldSchema] of Object.entries(currentTemplate.input.shape)) {
    const details = getFieldDetails(fieldSchema)
    if (isStringSchema(details.schema)) {
      const value = await input({
        message: `${fieldName}${details.optional ? " (optional)" : ""}`,
        default: details.defaultValue,
      })
      if (value.length > 0) {
        values[fieldName] = value
      }
      continue
    }

    if (isEnumSchema(details.schema)) {
      const choices = Object.values(details.schema._zod.def.entries)
        .filter((value): value is string => typeof value === "string")
        .map((value) => ({ name: value, value }))
      values[fieldName] = await select({
        message: `${fieldName}${details.optional ? " (optional)" : ""}`,
        choices,
        ...(details.defaultValue === undefined ? {} : { default: details.defaultValue }),
      })
      continue
    }

    values[fieldName] = await collectStructuredField(fieldName)
  }
  return values
}

async function showResult(value: unknown): Promise<"again" | "exit"> {
  const content = serializeOutput(value, "auto")
  process.stdout.write(`\n${content}`)
  const action = await select({
    message: "Result action",
    choices: [
      { name: "Run another template", value: "again" },
      { name: "Copy to clipboard", value: "copy" },
      { name: "Save to file", value: "save" },
      { name: "Exit", value: "exit" },
    ],
  })

  if (action === "copy") {
    await writeOutput(content, { clipboard: true })
    process.stdout.write("Copied to clipboard.\n")
    return showResult(value)
  }
  if (action === "save") {
    const destination = await input({ message: "Output path" })
    await writeOutput(content, { output: destination })
    process.stdout.write(`Saved to ${destination}.\n`)
    return showResult(value)
  }
  return action
}

export async function runInteractive(registry: TemplateRegistry): Promise<void> {
  const executor = new InProcessTemplateExecutor()

  while (true) {
    const templateChoices = Object.entries(registry).map(([templateId, currentTemplate]) => ({
      name: currentTemplate.name,
      description: currentTemplate.description === undefined
        ? templateId
        : `${templateId}: ${currentTemplate.description}`,
      value: templateId,
    }))
    const id = await search({
      message: "Search templates",
      pageSize: 12,
      source: (term) => {
        const normalizedTerm = term?.trim().toLocaleLowerCase() ?? ""
        return templateChoices.filter((choice) => {
          const searchable = `${choice.value} ${choice.name} ${choice.description}`.toLocaleLowerCase()
          return searchable.includes(normalizedTerm)
        })
      },
    })
    const currentTemplate = registry[id]
    if (currentTemplate === undefined) {
      throw new TemplateExecutionError(`Selected template '${id}' no longer exists.`)
    }

    while (true) {
      try {
        const templateInput = await collectObjectInput(currentTemplate)
        const result = await executor.execute(currentTemplate, templateInput)
        if (await showResult(result) === "exit") {
          return
        }
        break
      } catch (error: unknown) {
        process.stderr.write(`tp: ${formatError(error, false)}\n`)
        const retry = await select({
          message: "What next?",
          choices: [
            { name: "Edit inputs", value: "retry" },
            { name: "Choose another template", value: "again" },
            { name: "Exit", value: "exit" },
          ],
        })
        if (retry === "exit") {
          return
        }
        if (retry === "again") {
          break
        }
        if (!(error instanceof InputValidationError)) {
          continue
        }
      }
    }
  }
}
