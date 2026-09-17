import assert from 'node:assert/strict'
import test from 'node:test'
import { InputValidationError } from '@tempalace/core'
import { parseTemplateArguments, resolveInvocationInput } from '../src/input.js'
import { serializeOutput } from '../src/serialization.js'

test('keeps scalar + arguments as strings', () => {
  const parsed = parseTemplateArguments(['greet', '+name', 'Ada', '+count', '1'])
  assert.deepEqual(parsed, {
    argv: ['greet'],
    fields: { name: 'Ada', count: '1' },
  })
})

test('parses explicitly structured field values', () => {
  const parsed = parseTemplateArguments(['deploy', '+config:json', '{"enabled":true}'])
  assert.deepEqual(parsed.fields, { config: { enabled: true } })
})

test('rejects malformed or repeated + arguments', () => {
  assert.throws(() => parseTemplateArguments(['greet', '+name']), InputValidationError)
  assert.throws(() => parseTemplateArguments(['greet', '+name', 'Ada', '+name', 'Lin']), InputValidationError)
})

test('accepts primitive whole JSON, YAML, and plain-text input', async () => {
  assert.equal(await resolveInvocationInput({ input: 'Ada' }, {}), 'Ada')
  assert.equal(await resolveInvocationInput({ inputJson: '42' }, {}), 42)
  assert.equal(await resolveInvocationInput({ inputYaml: 'true' }, {}), true)
})

test('combines + arguments only with structured object input', async () => {
  assert.deepEqual(await resolveInvocationInput({ inputJson: '{"name":"Ada"}' }, { salutation: 'Hello' }), {
    name: 'Ada',
    salutation: 'Hello',
  })
  await assert.rejects(resolveInvocationInput({ inputJson: '42' }, { value: 'Ada' }), InputValidationError)
  await assert.rejects(resolveInvocationInput({ input: 'Ada' }, { value: 'Ada' }), InputValidationError)
})

test('rejects more than one whole-input representation', async () => {
  await assert.rejects(resolveInvocationInput({ input: 'Ada', inputJson: '"Ada"' }, {}), InputValidationError)
})

test('serializes outputs predictably', () => {
  assert.equal(serializeOutput('hello', 'auto'), 'hello\n')
  assert.equal(serializeOutput({ ok: true }, 'json'), '{\n  "ok": true\n}\n')
  assert.match(serializeOutput({ ok: true }, 'yaml'), /ok: true/)
  assert.throws(() => serializeOutput(undefined, 'auto'))
})
