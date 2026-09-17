import { isDeepStrictEqual } from 'node:util'
import { invoke } from './invoke.js'
import type { Template } from './template.js'

export interface TemplateCaseFailure {
  readonly index: number
  readonly input: unknown
  readonly expectedOutput: unknown
  readonly actualOutput?: unknown
  readonly error?: unknown
}

export interface TemplateTestResult {
  readonly passed: number
  readonly failures: readonly TemplateCaseFailure[]
}

export async function runTemplateTests<I, O>(template: Template<I, O>): Promise<TemplateTestResult> {
  const testCases = template.tests ?? []
  const failures: TemplateCaseFailure[] = []
  let passed = 0

  for (const [index, [input, expectedOutput]] of testCases.entries()) {
    try {
      const actualOutput = await invoke(template, input)
      if (!isDeepStrictEqual(actualOutput, expectedOutput)) {
        failures.push({ index, input, expectedOutput, actualOutput })
        continue
      }
      passed += 1
    } catch (error: unknown) {
      failures.push({ index, input, expectedOutput, error })
    }
  }

  return { passed, failures }
}
