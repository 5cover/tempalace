import { template, zod as z } from '@tempalace/core'

const greet = template({
  name: 'Greet',
  description: 'Generate a greeting.',
  input: z.object({
    name: z.string(),
    salutation: z.enum(['Hello', 'Bonjour']).default('Hello'),
  }),
  output: z.string(),
  run: ({ name, salutation }) => `${salutation} ${name}`,
  tests: [[{ name: 'Ada', salutation: 'Hello' }, 'Hello Ada']],
})

const summarize = template({
  name: 'Summarize',
  description: 'Return structured details for supplied text.',
  input: z.object({ text: z.string() }),
  output: z.object({ characters: z.number(), uppercase: z.string() }),
  run: ({ text }) => ({
    characters: text.length,
    uppercase: text.toUpperCase(),
  }),
})

const version = template({
  name: 'Version',
  description: 'Report the example registry version.',
  output: z.string(),
  run: () => '1.0.0',
  tests: [[undefined, '1.0.0']],
})

const uppercase = template({
  name: 'Uppercase',
  description: 'Convert a string input to uppercase.',
  input: z.string(),
  output: z.string(),
  run: value => value.toUpperCase(),
  tests: [['Ada', 'ADA']],
})

export default { greet, summarize, version, uppercase }
