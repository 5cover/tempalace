import { TemplateNotFoundError, runTemplateTests, type TemplateRegistry } from "@tempalace/core"

export async function runRegistryTests(registry: TemplateRegistry, id?: string): Promise<void> {
  if (id !== undefined) {
    const currentTemplate = registry[id]
    if (currentTemplate === undefined) {
      throw new TemplateNotFoundError(`Template '${id}' was not found in the registry.`)
    }
    await reportTemplateTests(id, currentTemplate)
    return
  }

  for (const [templateId, currentTemplate] of Object.entries(registry)) {
    await reportTemplateTests(templateId, currentTemplate)
  }
}

async function reportTemplateTests(templateId: string, currentTemplate: NonNullable<TemplateRegistry[string]>): Promise<void> {
  const result = await runTemplateTests(currentTemplate)
  if (result.failures.length === 0) {
    process.stdout.write(`PASS  ${templateId} (${result.passed} case${result.passed === 1 ? "" : "s"})\n`)
    return
  }

  process.stdout.write(`FAIL  ${templateId} (${result.failures.length} failing case${result.failures.length === 1 ? "" : "s"})\n`)
  for (const failure of result.failures) {
    const details = failure.error instanceof Error
      ? failure.error.message
      : `expected ${JSON.stringify(failure.expectedOutput)}, received ${JSON.stringify(failure.actualOutput)}`
    process.stdout.write(`  case ${failure.index + 1}: ${details}\n`)
  }
  throw new Error(`Template tests failed for '${templateId}'.`)
}
