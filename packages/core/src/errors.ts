export class TempalaceError extends Error {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = new.target.name
  }
}

export class RegistryNotFoundError extends TempalaceError {}

export class RegistryLoadError extends TempalaceError {}

export class InvalidRegistryError extends TempalaceError {}

export class TemplateNotFoundError extends TempalaceError {}

export class InputValidationError extends TempalaceError {
  public constructor(
    message: string,
    public readonly issues: readonly string[],
    options?: ErrorOptions,
  ) {
    super(message, options)
  }
}

export class TemplateExecutionError extends TempalaceError {}

export class OutputValidationError extends TempalaceError {
  public constructor(
    message: string,
    public readonly issues: readonly string[],
    options?: ErrorOptions,
  ) {
    super(message, options)
  }
}

export class SerializationError extends TempalaceError {}

export class OutputWriteError extends TempalaceError {}
