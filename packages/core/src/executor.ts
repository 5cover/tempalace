import { invokeTemplate, type InvocationOptions } from './invoke.js'
import type { Template } from './template.js'

export interface TemplateExecutor {
  execute(template: Template, input: unknown, options?: InvocationOptions): Promise<unknown>
}

export class InProcessTemplateExecutor implements TemplateExecutor {
  public execute(currentTemplate: Template, input: unknown, options?: InvocationOptions): Promise<unknown> {
    return invokeTemplate(currentTemplate, input, options)
  }
}
