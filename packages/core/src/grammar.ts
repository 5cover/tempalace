import type { Template } from "./template.js"

export interface GrammarSource {
  readonly path: string
  readonly content?: string
}

export interface Grammar {
  readonly name: string
  load(source: GrammarSource): Promise<Template<unknown, unknown>>
}
