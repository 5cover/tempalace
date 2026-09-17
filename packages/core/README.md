# @tempalace/core

Typed Template primitives for Tempalace. It provides the `template()` constructor, schema validation, invocation, registry contracts, template test cases, and extension seams.

```ts
import { template } from "@tempalace/core"
import { z } from "zod"

const greet = template({
  name: "Greet",
  input: z.object({ name: z.string() }),
  output: z.string(),
  run: ({ name }) => `Hello ${name}`,
})
```

See the [Tempalace README](https://github.com/5cover/tempalace#readme) for CLI usage, the complete API, and the trusted-code security model.

## License

MIT
