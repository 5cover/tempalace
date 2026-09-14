#!/usr/bin/env node
import { createCommand } from "@commander-js/extra-typings"
import {
  InProcessTemplateExecutor,
  JitiRegistryLoader,
  TemplateNotFoundError,
  type TemplateRegistry,
} from "@tempalace/core"
import { formatError } from "./errors.js"
import { parseTemplateArguments, readStructuredInput } from "./input.js"
import { findRegistryPath } from "./registry.js"
import { serializeOutput } from "./serialization.js"

interface DirectOptions {
  readonly registry?: string
  readonly debug?: boolean
  readonly nonInteractive?: boolean
  readonly inputJson?: string
  readonly inputYaml?: string
  readonly json?: boolean
  readonly yaml?: boolean
}

function getOutputFormat(options: DirectOptions): "auto" | "json" | "yaml" {
  if (options.json === true && options.yaml === true) {
    throw new Error("Use either --json or --yaml, not both.")
  }
  if (options.json === true) {
    return "json"
  }
  return options.yaml === true ? "yaml" : "auto"
}

async function getInput(options: DirectOptions, fields: Readonly<Record<string, unknown>>): Promise<unknown> {
  if (options.inputJson !== undefined && options.inputYaml !== undefined) {
    throw new Error("Use either --input-json or --input-yaml, not both.")
  }
  const wholeInput = options.inputJson !== undefined
    ? await readStructuredInput(options.inputJson, "json")
    : options.inputYaml !== undefined
      ? await readStructuredInput(options.inputYaml, "yaml")
      : {}

  if (wholeInput === null || typeof wholeInput !== "object" || Array.isArray(wholeInput)) {
    throw new Error("Whole structured input must be an object.")
  }

  for (const key of Object.keys(fields)) {
    if (Object.hasOwn(wholeInput, key)) {
      throw new Error(`Input '${key}' was provided both as structured input and a + argument.`)
    }
  }
  return { ...wholeInput, ...fields }
}

async function loadRegistry(cwd: string, registryPath?: string): Promise<TemplateRegistry> {
  const path = await findRegistryPath(cwd, registryPath)
  return new JitiRegistryLoader().load(path)
}

async function executeTemplate(
  id: string,
  options: DirectOptions,
  fields: Readonly<Record<string, unknown>>,
): Promise<void> {
  const registry = await loadRegistry(process.cwd(), options.registry)
  const currentTemplate = registry[id]
  if (currentTemplate === undefined) {
    throw new TemplateNotFoundError(`Template '${id}' was not found in the registry.`)
  }
  const input = await getInput(options, fields)
  const result = await new InProcessTemplateExecutor().execute(currentTemplate, input)
  process.stdout.write(serializeOutput(result, getOutputFormat(options)))
}

export async function runCli(argv: readonly string[]): Promise<void> {
  const parsed = parseTemplateArguments(argv)
  const program = createCommand()
    .name("tp")
    .description("Discover and run reusable schema-described templates.")
    .version("0.1.0")
    .option("-r, --registry <path>", "registry file path")
    .option("--debug", "show exception stacks")
    .option("--non-interactive", "fail instead of prompting for missing input")
    .option("--input-json <json>", "whole input as JSON, or - for stdin")
    .option("--input-yaml <yaml>", "whole input as YAML, or - for stdin")
    .option("--json", "serialize output as JSON")
    .option("--yaml", "serialize output as YAML")
    .argument("[id]", "registry template ID")
    .action(async (id: string | undefined, options: DirectOptions) => {
      if (id === undefined) {
        throw new Error("Interactive mode is not available yet. Specify a template ID.")
      }
      await executeTemplate(id, options, parsed.fields)
    })

  await program.parseAsync([...parsed.argv], { from: "user" })
}

async function main(): Promise<void> {
  try {
    await runCli(process.argv.slice(2))
  } catch (error: unknown) {
    const debug = process.argv.includes("--debug")
    process.stderr.write(`tp: ${formatError(error, debug)}\n`)
    process.exitCode = 1
  }
}

void main()
