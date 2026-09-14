export interface CliLogger {
  debug(message: string): void
  error(message: string): void
}

export class TerminalLogger implements CliLogger {
  public constructor(private readonly debugEnabled: boolean) {}

  public debug(message: string): void {
    if (this.debugEnabled) {
      process.stderr.write(`tp: debug: ${message}\n`)
    }
  }

  public error(message: string): void {
    process.stderr.write(`tp: ${message}\n`)
  }
}
