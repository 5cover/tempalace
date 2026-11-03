import assert from 'node:assert/strict'
import test from 'node:test'
import { z } from 'zod'
import { InputValidationError, OutputValidationError, TemplateExecutionError, invoke, template } from '../src/index.js'

test('invokes a typed synchronous template', async () => {
  const greet = template({
    name: 'Greet',
    input: z.object({ name: z.string() }),
    output: z.string(),
    run: ({ name }) => `Hello ${name}`,
  })

  assert.equal(await invoke(greet, { name: 'Ada' }), 'Hello Ada')
})

test('normalizes asynchronous template execution', async () => {
  const delayed = template({
    name: 'Delayed',
    input: z.string(),
    output: z.number(),
    run: async value => value.length,
  })

  assert.equal(await invoke(delayed, 'Ada'), 3)
})

test('invokes an input-less template without prompting for or validating input', async () => {
  const version = template({
    name: 'Version',
    output: z.string(),
    run: () => '1.0.0',
    tests: [[undefined, '1.0.0']],
  })

  assert.equal(await invoke(version), '1.0.0')
})

test('reports input validation failures', async () => {
  const currentTemplate = template({
    name: 'String',
    input: z.string(),
    output: z.string(),
    run: value => value,
  })

  // @ts-expect-error runtime validation must also reject input the types forbid
  await assert.rejects(invoke(currentTemplate, 42), InputValidationError)
})

test('wraps template exceptions', async () => {
  const currentTemplate = template({
    name: 'Explodes',
    input: z.string(),
    output: z.string(),
    run: () => {
      throw new Error('Nope')
    },
  })

  await assert.rejects(invoke(currentTemplate, 'x'), TemplateExecutionError)
})

test('validates output unless explicitly disabled', async () => {
  const currentTemplate = template({
    name: 'Bad output',
    input: z.string(),
    output: z.string().min(10),
    run: () => 'invalid',
  })

  await assert.rejects(invoke(currentTemplate, 'x'), OutputValidationError)
  assert.equal(await invoke(currentTemplate, 'x', { validateOutput: false }), 'invalid')
})

test('respects transforms in template input and output schemas', async () => {
  const tp = template({
    name: 'Transfomer',
    input: z.string().transform(s => s.length),
    output: z.number().transform(x => ({ x })),
    run: x => x + 1,
  })

  assert.deepEqual(await invoke(tp, 'abc', { validateOutput: true }), { x: 4 })
})

test('types invocation input as z.input and result as z.output', async () => {
  const tp = template({
    name: 'Transformer',
    input: z.string().transform(s => s.length),
    output: z.number().transform(x => ({ x })),
    run: x => x + 1,
  })

  const result: { x: number } = await invoke(tp, 'abc')
  assert.deepEqual(result, { x: 4 })

  // @ts-expect-error the raw input is a string, the number is produced by the transform
  await assert.rejects(invoke(tp, 4), InputValidationError)
  // @ts-expect-error the result is the parsed output object, not the number returned by run
  const numeric: number = await invoke(tp, 'abc')
  assert.deepEqual(numeric, { x: 4 })
})

test('passes the template as this to run, including recursive calls', async () => {
  const countdown = template({
    name: 'Countdown',
    input: z.number(),
    output: z.number(),
    run(n) {
      return n <= 0 ? 0 : this.run(n - 1)
    },
  })

  assert.equal(await invoke(countdown, 3), 0)
  assert.equal(await countdown.run(3), 0)
})

test('types this.input as the template input schema', async () => {
  const selfTyped = template({
    name: 'Self typed',
    input: z.string(),
    output: z.number(),
    run(value) {
      const schema: z.ZodString = this.input
      return schema.safeParse(value).success ? value.length : 0
    },
  })

  assert.equal(await invoke(selfTyped, 'Ada'), 3)
})

test('rejects a detached run reference because it has no template to bind as this', () => {
  const countdown = template({
    name: 'Countdown',
    input: z.number(),
    output: z.number(),
    run(n) {
      return n <= 0 ? 0 : this.run(n - 1)
    },
  })
  const detached = countdown.run

  // @ts-expect-error run requires its template as this, so a detached call does not type-check
  assert.throws(() => detached(3))
})

test('types run as receiving z.output of input and returning z.input of output', () => {
  template({
    name: 'Typed run',
    input: z.string().transform(s => s.length),
    output: z.number().transform(x => ({ x })),
    // @ts-expect-error run receives the parsed length and returns the number that the output transform consumes
    run: n => ({ x: n }),
  })
})
