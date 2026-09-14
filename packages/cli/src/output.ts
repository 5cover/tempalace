import { writeFile } from "node:fs/promises"
import clipboard from "clipboardy"
import { OutputWriteError } from "@tempalace/core"

export interface OutputDestinations {
  readonly clipboard?: boolean
  readonly output?: string
}

export async function writeOutput(content: string, destinations: OutputDestinations): Promise<void> {
  try {
    if (destinations.output !== undefined) {
      await writeFile(destinations.output, content, "utf8")
    }
    if (destinations.clipboard === true) {
      await clipboard.write(content)
    }
    if (destinations.output === undefined && destinations.clipboard !== true) {
      process.stdout.write(content)
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to write output."
    throw new OutputWriteError(message, { cause: error })
  }
}
