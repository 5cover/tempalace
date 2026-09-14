import { invoke, type InvocationOptions } from "./invoke.js"
import type { Template } from "./template.js"

export interface TemplateExecutor {
  execute(template: Template<unknown, unknown>, input: unknown, options?: InvocationOptions): Promise<unknown>
}

export class InProcessTemplateExecutor implements TemplateExecutor {
  public execute(
    currentTemplate: Template<unknown, unknown>,
    input: unknown,
    options?: InvocationOptions,
  ): Promise<unknown> {
    return invoke(currentTemplate, input, options)
  }
}
