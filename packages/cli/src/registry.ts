import { access } from "node:fs/promises"
import { constants } from "node:fs"
import { resolve } from "node:path"
import { RegistryNotFoundError } from "@tempalace/core"

const REGISTRY_FILENAMES = [
  "templates.ts",
  "templates.mts",
  "templates.cts",
  "templates.js",
  "templates.mjs",
  "templates.cjs",
] satisfies readonly string[]

export async function findRegistryPath(cwd: string, registryPath?: string): Promise<string> {
  if (registryPath !== undefined) {
    const candidate = resolve(cwd, registryPath)
    try {
      await access(candidate, constants.R_OK)
      return candidate
    } catch {
      throw new RegistryNotFoundError(`Registry '${candidate}' does not exist or cannot be read.`)
    }
  }

  for (const filename of REGISTRY_FILENAMES) {
    const candidate = resolve(cwd, filename)
    try {
      await access(candidate, constants.R_OK)
      return candidate
    } catch {
      continue
    }
  }

  throw new RegistryNotFoundError(
    `No registry found in '${cwd}'. Expected one of: ${REGISTRY_FILENAMES.join(", ")}.`,
  )
}

export { REGISTRY_FILENAMES }
