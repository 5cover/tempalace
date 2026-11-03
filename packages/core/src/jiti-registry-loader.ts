import { createJiti } from 'jiti'
import { InvalidRegistryError, RegistryLoadError } from './errors.js'
import { validateRegistry, type RegistryLoader, type TemplateRegistry } from './registry.js'
import { pathToFileURL } from 'url'

export class JitiRegistryLoader implements RegistryLoader {
  public async load(path: string): Promise<TemplateRegistry> {
    try {
      const jiti = createJiti(import.meta.url)
      let loaded
      loaded = await jiti.import(path, { default: true })
      if (loaded === null || typeof loaded !== 'object') {
        throw new RegistryLoadError('Registry module must have a default export.')
      }
      return validateRegistry(loaded)
    } catch (error: unknown) {
      if (error instanceof RegistryLoadError || error instanceof InvalidRegistryError) {
        throw error
      }
      const message = error instanceof Error ? error.message : 'Unable to load registry.'
      throw new RegistryLoadError(`Unable to load registry '${path}': ${message}`, { cause: error })
    }
  }
}
