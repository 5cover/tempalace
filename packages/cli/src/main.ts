#!/usr/bin/env node
import { createCommand } from '@commander-js/extra-typings'
import {
  InProcessTemplateExecutor,
  InputValidationError,
  JitiRegistryLoader,
  TemplateNotFoundError,
  isParameterizedTemplate,
  type TemplateRegistry,
} from '@tempalace/core'
import { formatError } from './errors.js'
import { runInteractive } from './interactive.js'
import { parseTemplateArguments, readStructuredInput } from './input.js'
import { TerminalLogger, type CliLogger } from './logger.js'
import { writeOutput } from './output.js'
import { findRegistryPath } from './registry.js'
import { serializeOutput } from './serialization.js'
import { runRegistryTests } from './testing.js'

interface DirectOptions {
  readonly registry?: string
  readonly debug?: boolean
  readonly nonInteractive?: boolean
  readonly inputJson?: string
  readonly inputYaml?: string
  readonly json?: boolean
  readonly yaml?: boolean
  readonly clipboard?: boolean
  readonly output?: string
}

function getOutputFormat(options: DirectOptions): 'auto' | 'json' | 'yaml' {
  if (options.json === true && options.yaml === true) {
    throw new Error('Use either --json or --yaml, not both.')
  }
  if (options.json === true) {
    return 'json'
  }
  return options.yaml === true ? 'yaml' : 'auto'
}

async function getInput(options: DirectOptions, fields: Readonly<Record<string, unknown>>): Promise<unknown> {
  if (options.inputJson !== undefined && options.inputYaml !== undefined) {
    throw new Error('Use either --input-json or --input-yaml, not both.')
  }
  const wholeInput =
    options.inputJson !== undefined
      ? await readStructuredInput(options.inputJson, 'json')
      : options.inputYaml !== undefined
        ? await readStructuredInput(options.inputYaml, 'yaml')
        : {}

  if (wholeInput === null || typeof wholeInput !== 'object' || Array.isArray(wholeInput)) {
    throw new Error('Whole structured input must be an object.')
  }

  for (const key of Object.keys(fields)) {
    if (Object.hasOwn(wholeInput, key)) {
      throw new Error(`Input '${key}' was provided both as structured input and a + argument.`)
    }
  }
  return { ...wholeInput, ...fields }
}

async function loadRegistry(
  cwd: string,
  registryPath: string | undefined,
  logger: CliLogger
): Promise<TemplateRegistry> {
  const path = await findRegistryPath(cwd, registryPath)
  logger.debug(`Loading registry '${path}'.`)
  return new JitiRegistryLoader().load(path)
}

async function executeTemplate(
  id: string,
  options: DirectOptions,
  fields: Readonly<Record<string, unknown>>,
  logger: CliLogger
): Promise<void> {
  const registry = await loadRegistry(process.cwd(), options.registry, logger)
  const currentTemplate = registry[id]
  if (currentTemplate === undefined) {
    throw new TemplateNotFoundError(`Template '${id}' was not found in the registry.`)
  }
  if (!isParameterizedTemplate(currentTemplate)) {
    if (Object.keys(fields).length > 0 || options.inputJson !== undefined || options.inputYaml !== undefined) {
      throw new InputValidationError(`Template '${id}' does not accept input.`, [])
    }
    logger.debug(`Executing input-less template '${id}'.`)
    const result = await new InProcessTemplateExecutor().execute(currentTemplate, undefined)
    await writeOutput(serializeOutput(result, getOutputFormat(options)), options)
    return
  }
  const input = await getInput(options, fields)
  logger.debug(`Executing template '${id}'.`)
  const result = await new InProcessTemplateExecutor().execute(currentTemplate, input)
  await writeOutput(serializeOutput(result, getOutputFormat(options)), options)
}

export async function runCli(argv: readonly string[]): Promise<void> {
  const parsed = parseTemplateArguments(argv)
  const program = createCommand()
    .name('tp')
    .description('Discover and run reusable schema-described templates.')
    .version('0.1.0')
    .option('-r, --registry <path>', 'registry file path')
    .option('--debug', 'show exception stacks')
    .option('--non-interactive', 'fail instead of prompting for missing input')
    .option('--input-json <json>', 'whole input as JSON, or - for stdin')
    .option('--input-yaml <yaml>', 'whole input as YAML, or - for stdin')
    .option('--json', 'serialize output as JSON')
    .option('--yaml', 'serialize output as YAML')
    .option('-c, --clipboard', 'copy output to the system clipboard')
    .option('-o, --output <path>', 'write output to a file')
    .argument('[id]', 'registry template ID')
    .action(async (id: string | undefined, options: DirectOptions) => {
      const logger = new TerminalLogger(options.debug === true)
      if (id === undefined) {
        const registry = await loadRegistry(process.cwd(), options.registry, logger)
        await runInteractive(registry)
        return
      }
      await executeTemplate(id, options, parsed.fields, logger)
    })

  program.addCommand(
    createCommand('test')
      .description('Run declared template test cases.')
      .argument('[id]', 'registry template ID')
      .action(async (id: string | undefined) => {
        const commandOptions = program.opts()
        const registryPath = typeof commandOptions.registry === 'string' ? commandOptions.registry : undefined
        const logger = new TerminalLogger(commandOptions.debug === true)
        const registry = await loadRegistry(process.cwd(), registryPath, logger)
        await runRegistryTests(registry, id)
      })
  )

  await program.parseAsync([...parsed.argv], { from: 'user' })
}

async function main(): Promise<void> {
  try {
    await runCli(process.argv.slice(2))
  } catch (error: unknown) {
    const debug = process.argv.includes('--debug')
    new TerminalLogger(debug).error(formatError(error, debug))
    process.exitCode = 1
  }
}

void main()
