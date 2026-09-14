import { createJiti } from "jiti"
import { InvalidRegistryError, RegistryLoadError } from "./errors.js"
import { validateRegistry, type RegistryLoader, type TemplateRegistry } from "./registry.js"

export class JitiRegistryLoader implements RegistryLoader {
  public async load(path: string): Promise<TemplateRegistry> {
    try {
      const jiti = createJiti(import.meta.url, { interopDefault: false })
      const loaded = await jiti.import<unknown>(path)
      if (loaded === null || typeof loaded !== "object" || !("default" in loaded)) {
        throw new RegistryLoadError("Registry module must have a default export.")
      }
      return validateRegistry(loaded.default)
    } catch (error: unknown) {
      if (error instanceof RegistryLoadError || error instanceof InvalidRegistryError) {
        throw error
      }
      const message = error instanceof Error ? error.message : "Unable to load registry."
      throw new RegistryLoadError(`Unable to load registry '${path}': ${message}`, { cause: error })
    }
  }
}
